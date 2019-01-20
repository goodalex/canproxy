/**
 *
 * Manages a run and its lifecycle, states, persistance etc.
 * Creating, starting, stopping...
 *
 * Executes a run in Kubernetes:
 *  - Creates Kubernetes Components in Kubernetes for canary and baseline (services and deployments)
 *  - Performs the switch of Kubernetes Services to realize the interception of requests
 *    (That logic should be migrated to "executor", but mostly its here )
 *
 *
 */


const validate = require("validate.js");
const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');


const executor = require.main.require('./modules/executor/kubeExecutor');

executor.init( getRun, update );

const kubeClient = require.main.require('./modules/executor/kubeClient.js');


const dao = require('./runsDao.js');
const report = require.main.require('./modules/reports/reportsController.js');

const assert = require('assert');

var status = {
    CREATED: "created",
    PREPARING: "creating_components",
    READY: "ready",
    INTERCEPTING: "intercepting_requests",
    CLEANUP: "removing_components",
    FINISHED: "finished" //NOT USED CURRENTLY, RUN RETURNS TO CREATED
}

var RESOURCE_ROLE = {
    ORIGINAL: "original",
    ORIGINAL_CLONE: "originalclone",
    INTERCEPTOR: "interceptor",
    CANARY: "canary",
    BASELINE: "baseline"
}

var RESOURCE_STATUS = {
    CREATED: "created",
    DELETED: "deleted"
}

function setStatusReady(run) {
    run.status = status.READY;
    return update( run );
}

function setStatusCleanup(run) {
    run.status = status.CLEANUP;
    return update( run );
}

function setStatusCreated(run) {
    run.status = status.CREATED;
    return update( run );
}

function createValidationErrorObj(validationError) {
   return { validationError: validationError }
}

function getShortRunId(runId) {
    return "r"+runId.substring(0, 8);
}

function createResourceAppName(deploymentName, runId, resourceRole) {
    return "ywc-"+deploymentName+"-"+resourceRole.substring(0,4)+"-"+getShortRunId(runId);
}

function getOperatingNamespaceName( run ) {
    return run.resources.original.namespace.name;
}

function getOperatingServiceName( run ) {
    return run.resources.original.service.name;
}

function getRun(id) {
    return dao.get(id);
}

function get(id) {
    return getRun(id).then(function(run) {
        appendReadyServices( run );
        return run;
    });
}

var createConstraints = {
    "namespace.name": {
        presence: true
    },
    "service.name": {
        presence: true
    },
    "deployment.name": {
        presence: true
    },
    "canary_share": {
        presence: true
    }
};

var phaseOptionsConstraints = {
    "preparation.autostart": {
        presence: true
    },
    "preparation.autostart_delay_seconds": {
        presence: true
    },
    "interception.autostart": {
        presence: true
    },
    "interception.autostart_delay_seconds": {
        presence: true
    }
};

/**
 * Example input:
 *
{
    "namespace": {
        "name": "webservice"
    },
    "service": {
        "name": "webservice"
    },
    "deployment": {
        "name": "webservice"
    },
    "canary_share": 0.1,
    "phase_options": {
        "preparation": {
            "autostart": true,
            "autostart_delay_seconds": 0
        },
        "interception": {
            "autostart": true,
            "autostart_delay_seconds": 10,
            "autostop": false,
            "autostop_delay_seconds": 60
        }
    }
}

 *
 */
function create(_input) {

    return new Promise(function(resolve, reject) {
        resolve( validateAndPrepareObject( _input ) );
    })
    .then( dao.create )
    .then( preparationAutostartCheck );

    function validateAndPrepareObject(input) {
        var validationError = validate( input, createConstraints );
        if ( validationError ) {
            throw createValidationErrorObj( validationError );
        }

        var id = uuidv4();
        var created = new Date();

        var run = {
            id: id,
            id_short: getShortRunId( id ),
            created: created.getTime(),
            created_formatted: created.toISOString(),
            status: status.CREATED,
            shared_data: {
                canary_share: input.canary_share,
                sut_balancing_strategy: input.sut_balancing_strategy || "rruri"
            },
            canary_modification: input.canary_modification,
            phase_states: {
                interception: {
                    last_started: null
                }
            },
            resources: {
                original: {
                    namespace: {
                        name: input.namespace.name
                    },
                    service: {
                        name: input.service.name
                    },
                    deployment: {
                        name: input.deployment.name
                    }
                },
                originalclone: null,
                interceptor: null,
                canary: null,
                baseline: null
            },
            phase_options: {
                preparation: {
                    autostart: true,
                    autostart_delay_seconds: 0
                },
                interception: {
                    autostart: true,
                    autostart_delay_seconds: 10
                }
            }
        };

        //use phase options from input if available and valid
        if ( input.phase_options ) {
            var validationError = validate( input.phase_options, phaseOptionsConstraints );
            if ( validationError ) {
                throw createValidationErrorObj( validationError );
            } else {
                run.phase_options = input.phase_options;
            }

        }

        run.flags = {};

        return run;
    }

    function preparationAutostartCheck(run_int) {
        if ( run_int.phase_options.preparation.autostart === true ) {
            console.log( "preparation autostarting " + run_int.id_short );
            preparationStartAsync( run_int.id, run_int.phase_options.preparation.autostart_delay_seconds * 1000 );
        }
        return run_int;
    }

}

function update(item) {
    return dao.update( item );
}

function deleteAll() {
    return dao.deleteAll();
}

function getAll() {

    return dao.getAll().then( formatForStringPrint );

    function formatForStringPrint(runs) {
        if( !runs ) throw new Error('No record found.');

        var reponseArr = [];

        runs.forEach(function(run) {

            appendReadyServices( run );

            reponseArr.push( formatRun_prettyAndCompactStr(run) );

        });

        return reponseArr;
    }

}


function appendReadyServices(run) {

    function isReady(resource) {
        return resource.status == RESOURCE_STATUS.CREATED;
    }

    [ RESOURCE_ROLE.ORIGINAL_CLONE, RESOURCE_ROLE.CANARY, RESOURCE_ROLE.BASELINE ].forEach(function( resourceRole ) {

        var sourceKey = resourceRole;
        var targetKey = resourceRole;

        if ( sourceKey == RESOURCE_ROLE.ORIGINAL_CLONE ) {
            targetKey = "default";
        }

        if ( run.resources[sourceKey] && run.resources[sourceKey].service && isReady(run.resources[sourceKey].service) ) {
            run.shared_data = run.shared_data || {};
            run.shared_data.readyServices = run.shared_data.readyServices || {};
            run.shared_data.readyServices[targetKey] = {
                appended_formatted: new Date().toISOString(),
                serviceName: run.resources[sourceKey].service.configTemplate.metadata.name,
                namespaceName: run.resources.original.namespace.name
            };
        }

    });

}

function cloneOriginalServiceConfig(run) {
    return JSON.parse( JSON.stringify( run.resources.original.service.config ) );
}

/**
 *
 * Prepare the execution of a run.
 *
 * Includes:
 * - Save the current environment state
 * - Deploy all required components into the environment,
 * including the balancer, canary and the baseline
 *
 * @param {*} id
 */
function preparationStart(id) {

    return getRun( id )
        .then( assertNotInStatusIntercepting )
        .then( setStatusPreparing )
        .then( executor.createBalancer )
        .then( getOriginalServiceDetails )
        .then( createOriginalCloneServiceInK8s )
        .then( createCanaryInK8s )
        .then( createBaselineInK8s )
        .then( createInterceptorConfig )
        .then( setStatusReady )
        .then( interceptionAutostartCheck );

    //throw error if run is intercepting requests
    function assertNotInStatusIntercepting(run) {
        if ( isStatusIntercepting( run ) ) {
            throw { conflictError: "cannot start preparation while intercepting requests" };
        } else {
            return run;
        }
    }

    //populate run with the Kubernetes Service of the tested microservices
    function getOriginalServiceDetails(_run) {

        var namespace = _run.resources.original.namespace.name;
        var name = _run.resources.original.service.name;

        return kubeClient.getService( namespace, name )
            .then(function(service) {

                //mark retrival from Kubernetes as successfull (for debug & monitoring)
                return updateFlagFunctionSuccess( _run, "k8s_original_service_get_response", true).then(function(run) {
                    console.log( 'getOriginalServiceDetails' );

                    if ( !service || !service.metadata ) throw "service or service.metadata missing";

                    //attach original Kubernetes service to run
                    run.resources.original.service.config = service;
                    return run;
                });

            })
            .then( flagSetSuccessAndUpdate( "k8s_original_service_read_details" ) )
            .then( update )
            .catch( function(err) {
                throw { functionFail: "k8s_original_service_read_details", run: run, service: service, err: err };
            });
    }

    function createOriginalCloneServiceInK8s(_run) {

        console.log("createOriginalCloneServiceInK8s");

        try {

            if (_run.resources.originalclone && _run.resources.originalclone.service && _run.resources.originalclone.service.status == RESOURCE_STATUS.CREATED) {
                console.log( "original clone - was created already" );
                return _run;
            }

            var cloneConfig = cloneOriginalServiceConfig( _run );

            cloneConfig.metadata.name = createResourceAppName( _run.resources.original.service.name, _run.id, RESOURCE_ROLE.ORIGINAL_CLONE );
            cloneConfig.metadata.namespace = getOperatingNamespaceName( _run );

            cloneConfig.metadata.labels = cloneConfig.metadata.labels || {};
            cloneConfig.metadata.labels['ywc.module'] = "true";
            cloneConfig.metadata.labels['ywc.role'] = RESOURCE_ROLE.ORIGINAL_CLONE;

            _run.resources.originalclone = _run.resources.originalclone || {};

            _run.resources.originalclone.service = {
                configTemplate: cloneConfig,
                name: cloneConfig.metadata.name
            };

        } catch (error) {
            console.log( error );
            throw error;
        }

        return update(_run).then( function(run) {

            return kubeClient.createService( run.resources.original.namespace.name, cloneConfig ).then(function() {
                run.resources.originalclone.service.status = RESOURCE_STATUS.CREATED;

                return updateFlagFunctionSuccess( run, "k8s_original_clone_created", true).then( update );
            });

        })
        .catch(function(err) {
            console.log(err);
            throw { functionFail: "k8s_original_clone_created", run: _run, err: err };
        });


    }

    /**
     * creates canary resources
     * @param {*} _run
     */
    function createCanaryInK8s(_run) {

        /**
          Converts a Deployment into a canary Deployment
          by applying modifications provided by user input.
          Modifications are e.g. a new image version.
          @param config: the Kubernetes Deployment that is the basis for the canary
        **/
        function modification( config ) {

            //load provided canary modifications
            var mods = _run.canary_modification;

            notNull( mods );
            notNull( mods.deployment );

            // go thorugh all fields that were given as input
            var modsKeys = Object.keys( mods.deployment );
            modsKeys.forEach( function( key ) {
              var value = mods.deployment[ key ];
              if ( value ) {

                //apply modification to config
                //only 2 fields of a Kubernetes Deyployment possible
                //mapping should be dynamic
                if ( key == "spec.template.spec.containers[0].image" ) {
                  config.spec.template.spec.containers[0].image = value;
                } else if ( key == "spec.template.spec.containers[0].env[0].value" ) {
                  config.spec.template.spec.containers[0].env[0].value = value;
                }

              }
            });

            kubeDeploymentSetNodeTypeSut( config );
        }

        return createDerivedResourcesInK8s( _run, RESOURCE_ROLE.CANARY, modification );

    }

    /**
     * creates baseline resources
     * @param {*} _run
     */
    function createBaselineInK8s(_run) {

        function modification( config ) {
            var originalArgs = config.spec.template.spec.containers[0].env[0].value;
            var newArgs = originalArgs.replace( 'production', 'baseline');

            config.spec.template.spec.containers[0].env[0].value = newArgs;

            kubeDeploymentSetNodeTypeSut( config );
        }

        return createDerivedResourcesInK8s( _run, RESOURCE_ROLE.BASELINE, modification );

    }

    function kubeDeploymentSetNodeTypeSut(config) {
        //append node selector
        config.spec.template.spec.nodeSelector  = executor.getSutNodeSelector();
        config.spec.template.spec.tolerations   = executor.getSutNodeTolerations();
    }

    /**
     * creates deployment and service for resource role, e.g. CANARY or BASELINE
     * @param {*} _run
     */
    function createDerivedResourcesInK8s(_run, resourceRole, applyCustomModification) {

        console.log( "createDerivedResourcesInK8s " + resourceRole );

        const resourceStorageKey = resourceRole+"";
        const appName = createResourceAppName( _run.resources.original.service.name, _run.id, resourceRole);

        var namespace   = _run.resources.original.namespace.name;
        var deployment  = _run.resources.original.deployment.name;

        //read current deployment
        return kubeClient.getDeploymentJsonStr( namespace, deployment ).then(function(jsonStr) {
                return flagSetSuccessAndUpdate( "k8s_original_deloyment_retrieved" )(_run).then(function() {
                    return jsonStr;
                });
            })
            .then(function(jsonStr) {
                console.log( "deployment convert json string" );
                if (!jsonStr) throw "jsonStr required";


                var deployment = JSON.parse(jsonStr);


                _run.resources.original.deployment.config = deployment;
                console.log( "deployment json string converted" );
                return _run;
            })
            .then( update )
            .then( function( run ) {

                //create deployment config

                //get deployment config of original microservice as basis
                var config = cloneJsObject( run.resources.original.deployment.config );
                var namespace = getOperatingNamespaceName( run );

                //appname was generated before, based on resource type and run id
                //for instance: ywc-cana-r1000001, ywc-base-r1000001, ...
                applyBasicModification( config, appName, namespace, resourceRole );

                //until here the Deployment is a clone with a unique name,
                //but without changes.
                //the ollowing function is dynamic
                //and will turn the Deployment into a canary or baseline
                applyCustomModification( config );

                attachConfigToRun( run, resourceStorageKey, config );
                return update(run); //persist changes to run object

                //subfunctions
                /**
            		* adjusts config so that it is an independent deployment
            		**/
                function applyBasicModification(config, appName, namespace, resourceRole) {
                  config.metadata.name = appName;
                  config.metadata.namespace = namespace;
                  config.metadata.labels.app = appName;
                  config.spec.selector.matchLabels.app = appName;
                  config.spec.template.metadata.labels.app = appName;
                  config.spec.replicas = 1;
                  config.metadata.labels["ywc.module"] = "true";
                  config.metadata.labels["ywc.role"] = resourceRole;
                }

                //attach config to run object into a specific resourceStorageKey
                function attachConfigToRun(run, resourceStorageKey, config) {
                  run.resources[resourceStorageKey] = run.resources[resourceStorageKey] || {};
                  run.resources[resourceStorageKey].appName = appName;
                  run.resources[resourceStorageKey].deployment = run.resources[resourceStorageKey].deployment || {};
                  run.resources[resourceStorageKey].deployment.name = appName;
                  run.resources[resourceStorageKey].deployment.configTemplate = config;
                }

            })
            .then(function(run) {

                //deploy the resource by applying the deployment config to Kubernetes
                var currentResource = run.resources[resourceStorageKey];
                var deploymentCfg = currentResource.deployment.configTemplate;

                return kubeClient.kubectlApplyByObject( deploymentCfg )
                .then( function(result) {
                    console.log(result);

                    //set resource status and persist changes
                    currentResource.deployment.status = RESOURCE_STATUS.CREATED;
                    return update(run);
                })

            })
            .then(function(run) {

                //create service config for the previously created deployment

                var service = cloneOriginalServiceConfig( run );

                service.metadata.name = appName;
                service.metadata.namespace = run.resources[resourceStorageKey].deployment.configTemplate.metadata.namespace;
                service.metadata.labels = service.metadata.labels || {};
                service.metadata.labels['ywc.module'] = "true";
                service.metadata.labels['ywc.role'] = resourceRole;
                service.spec.selector = {
                    app: appName
                };

                //save config
                run.resources[resourceStorageKey].service = {
                    name: service.metadata.name,
                    configTemplate: service
                };
                return update( run );

            })
            .then(function(run) {

                //deploy service

                var service = run.resources[resourceStorageKey].service.configTemplate;

                return kubeClient.kubectlApplyByObject( service ).then( function(result) {
                    console.log(result);

                    run.resources[resourceStorageKey].service.status = RESOURCE_STATUS.CREATED;
                    return update( run );
                });

            })
            .catch(function(err) {
                console.log(err);
                throw err;
            });
    }

    function cloneJsObject(obj) {
      return JSON.parse( JSON.stringify( obj ) );
    }

    function createInterceptorConfig(run) {

        console.log("createInterceptorConfig");

        var conf = {
            apiVersion: "v1",
            kind: "Service",
            metadata: {
              //imitate to be the original service
              namespace: run.resources.original.namespace.name,
              name: run.resources.original.service.name,
              labels: {
                "ywc.module": "true",
                "ywc.role": "interceptor"
              }
            },
            spec: {
              selector: {
                  //select the balancer
                  app: run.resources.balancer.service.name
              },
              ports: [ {
                protocol: "TCP",
                port: 80,
                targetPort: 8080
              }]
            }
        };

        //attach interceptor config to run
        run.resources.interceptor = run.resources.interceptor || {};
        run.resources.interceptor.service = {
            name: conf.metadata.name,
            configTemplate: conf
        };

        return updateFlagFunctionSuccess( run, "interceptor_config_created", true).then(function(run) {
            return run;
        });
    }

    function interceptionAutostartCheck(run) {
        if ( run.phase_options.interception.autostart === true) {
            console.log( "interception autostarting " + run.id_short );
            interceptionStartAsync( run.id, run.phase_options.interception.autostart_delay_seconds * 1000 );
        }

        return run;
    }

}

function preparationStartAsync(runid, delayMilliSeconds) {
    setTimeout(function() { //cheap async start
        preparationStart( runid );
    }, delayMilliSeconds + 1); //+1 so its most likely never 0
}

/*

 - deletes all components such as canary and baseline after a performnace assessment run

*/
function cleanupStart(id) {

    return getRun( id )
    .then( interceptionStopIfIntercepting )
    .then( setStatusCleanup )
    .then( deleteCanaryInK8s )
    .then( deleteBaselineInK8s )
    .then( deleteOriginalcloneInK8s )
    .then( executor.deleteBalancer )
    .then( setStatusCreated ); //just put back to "created" for now

    function interceptionStopIfIntercepting(run) {
        if ( run.status == status.INTERCEPTING ) {
            return interceptionStop( run.id );
        } else {
            return run;
        }
    }

    function deleteCanaryInK8s(run) {
        return executor.deleteResourceRoleInK8s( run, RESOURCE_ROLE.CANARY, run.resources.original.namespace.name );
    }

    function deleteBaselineInK8s(run) {
        return executor.deleteResourceRoleInK8s( run, RESOURCE_ROLE.BASELINE, run.resources.original.namespace.name );
    }

    function deleteOriginalcloneInK8s(run) {
        return executor.deleteResourceRoleInK8s( run, RESOURCE_ROLE.ORIGINAL_CLONE, run.resources.original.namespace.name );
    }



}


function interceptionStart( id ) {

    if ( !id ) {
        return { validationError: "id required" }
    }

    return getRun( id )
        .then( replaceOriginalServiceByInterceptor )
        .then( setStatusIntercepting )
        .then( interceptionAutostopCheck )
        .catch( onInterceptionStartError );


    function replaceOriginalServiceByInterceptor( run ) {

        console.log("replaceOriginalServiceByInterceptor")

        var serviceName = getOperatingServiceName( run )
        var namespaceName = getOperatingNamespaceName( run );

        if (serviceName == null) {
            throw { error: "serviceName cannot be null"}
        }

        if (namespaceName == null) {
            throw { error: "namespaceName cannot be null"}
        }

        return kubeClient.kubectlApplyByObject( run.resources.interceptor.service.configTemplate ).then(function(result) {
            console.log( result );
            return updateFlagFunctionSuccess( run, "interceptor_released", true);
        }).catch( function(err) {
            updateFlagFunctionSuccess( run, "interceptor_released", false);
            console.log( err.body, run.resources.interceptor.service.configTemplate );
            throw "kubectlApply failed";
        });

    }

    function setStatusIntercepting(run) {
        run.status = status.INTERCEPTING;
        return update( run );
    }

    function interceptionAutostopCheck(run_int) {
        if ( run_int.phase_options.interception.autostop === true ) {
            console.log( "interception autostopping " + run_int.id_short );
            interceptionStopAsync( run_int.id, run_int.phase_options.interception.autostop_delay_seconds * 1000 );
        }
        return run_int;
    }

    function onInterceptionStartError(err) {
        console.error('interceptionStart error', err);
    }

}

function interceptionStartAsync(runid, delayMilliSeconds) {
    setTimeout( function() {
        interceptionStart( runid );
    }, delayMilliSeconds );
}

function interceptionStopAsync(runid, delayMilliSeconds) {
    setTimeout( function() {
        interceptionStop( runid );
    }, delayMilliSeconds );
}

function interceptionStop( id ) {
    if ( !id ) {
        return { validationError: "id required" }
    }

    return getRun( id )
        .then( replaceInterceptorByOriginalService )
        .then( setStatusReady )
        .catch(function(err) {
            console.error('interceptionStop error', err);
        });

    function replaceInterceptorByOriginalService( run ) {

        //execute kubectl with namespace, if there is no namespace in the config metadata
        var namespace = run.resources.original.service.config.metadata.namespace ? null : run.resources.original.namespace.name;

        return kubeClient.kubectlApplyByObject( run.resources.original.service.config, namespace ).then(function(result) {
            console.log( result );
            return updateFlagFunctionSuccess( run, "original_service_rereleased", true);
        }).catch( function(err) {
            updateFlagFunctionSuccess( run, "original_service_rereleased", false);
            console.log( err.body, run.resources.interceptor.configTemplate );
            throw "kubectlApply failed";
        });
    }



}

function isStatusIntercepting(run) {
    return run.status == status.INTERCEPTING;
}

function setStatusReady(run) {
    run.status = status.READY;
    return update( run );
}

function setStatusPreparing(run) {
    run.status = status.PREPARING;
    return update( run );
}


function updateFlag(item, key, value) {

    console.log( "updateFlag", key, value );

    if (value instanceof Date) {
        item.flags[key] = value.toISOString();
    } else {
        item.flags[key] = value;
    }

    return update(item).then(function(updated) {
        console.log( "updateFlag success", key, value );
        assert( updated.flags[key] != null );
        return updated;
    });

}

function flagSetSuccessAndUpdate(key) {
    return function(run) {
        return updateFlagFunctionSuccess(run, key, true);
    }
}

function flagFailAndThrow(runid, key) {
    return function(error) {
        concole.log(error);
        getRun( id ).then(function(run) {
            updateFlagFunctionSuccess(run, key, false);
        });
        throw error;
    };
}

function updateFlagFunctionSuccess(item, key, value) {

    var successKey = key+"_success";
    var lastSuccessKey = key+"_success_last";

    return updateFlag(item, successKey, value)
        .then( function(updatedItem) {
            if (value === true) {
                return updateFlag(updatedItem, lastSuccessKey, new Date().toISOString() );
            } else {
                return updatedItem;
            }
        });

}

function formatRun_prettyAndCompactStr(run) {

    var runClone = JSON.parse( JSON.stringify( run ) );

    formatResources( runClone );

    return runClone;

    function formatResources(run) {
        if (run.resources) {

            Object.keys( run.resources ).forEach( function(resourceRole) {
                formatResource_replaceLargeObjectsWithStrings( run, resourceRole );
            });

        }
    }

    function formatResource_replaceLargeObjectsWithStrings(run, resourceRole) {

        if (run.resources[resourceRole]) {

            ["deployment", "service"].forEach(function(kind) {

                if (run.resources[resourceRole][kind]) {

                    if (run.resources[resourceRole][kind].configTemplate) {
                        run.resources[resourceRole][kind].configTemplate_formattedStr = JSON.stringify( run.resources[resourceRole][kind].configTemplate );
                        delete run.resources[resourceRole][kind].configTemplate;
                    }

                    if (run.resources[resourceRole][kind].config) {
                        run.resources[resourceRole][kind].config_formattedStr = JSON.stringify( run.resources[resourceRole][kind].config );
                        delete run.resources[resourceRole][kind].config;
                    }

                }

            });

        }

    }

}

function getRequestLog(runid) {
    return getRun( runid ).then( executor.getBalancerRequestLog );
}

function getBalancerStatus(runid) {
    return getRun( runid ).then( executor.getBalancerStatus );
}

const balancerClient = require.main.require('./modules/executor/kubeBalancerClient.js');

function balancerPipeManagementRequest(runid, req, res, path) {
    getRun( runid ).then( function(run) {
        balancerClient.pipeManagementRequest( executor.getBalancerLocation( run ), path , req, res );
    });
}

function notNull(val, displayName) {
  if ( val == null ) throw displayName + " cannot be null";
}

module.exports = {
    get: get,
    getAll: getAll,
    create: create,
    deleteAll: deleteAll,
    interceptionStart: interceptionStart,
    interceptionStop: interceptionStop,
    preparationStart: preparationStart,
    cleanupStart: cleanupStart,
    getReport: report.createReport,
    getRequestLog: getRequestLog,
    getBalancerStatus: getBalancerStatus,
    balancerPipeManagementRequest: balancerPipeManagementRequest
};
