/*

Idea of "executor" is to abstract the execution of a run in a specific environment.

Executes a run in Kubernetes.

Most execution logic is historically in runsController,
bur for a better modularization it should be mirgrated here.

*/


const yaml = require('js-yaml');
const fs   = require('fs');

const kubeClient = require.main.require('./modules/executor/kubeClient.js');




// controller functions
var _update;
var _getRun;

function init(getRun, update) {
    _getRun = getRun;
    _update = update;
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


function createBalancer(_run) {

    var ywcResource = "balancer";

    var runWithBalancerConfig = attachBalancerKubeConfig( _run );

    return _update( runWithBalancerConfig) 
    .then( function( run ) {
        return deployYwcResource(run, ywcResource, "deployment");
    } )
    .then( _update )
    .then( function( run ) {
        return deployYwcResource(run, ywcResource, "service");
    } )
    .then( _update );

}

function deleteBalancer(_run) {
    return deleteResourceRoleInK8s(_run, "balancer", _run.resources.balancer.deployment.namespace );
}


function deployYwcResource(_run, ywcResource, kubeResource) {
    console.log('kubeExecutor - deploy ' + ywcResource + ' ' + kubeResource + ', runid + ' + _run.id_short );
    var configTemplate = _run.resources[ywcResource][kubeResource].configTemplate;

    return kubeClient.kubectlApplyByObject( configTemplate ).then( function(result) {
        console.log(result);    

        _run.resources[ywcResource][kubeResource].status = "created";
        return _run;
    });
}

function attachBalancerKubeConfig(run) {

    console.log( "attachBalancerKubeConfig" );

    run.resources.balancer = {};

    var balancerDeployment = getBalancerDeploymentTemplate();
    if ( balancerDeployment ) {

        var name = balancerDeployment.metadata.name + "-" + run.id_short;

        balancerDeployment.metadata.namespace = run.resources.original.namespace.name;
        balancerDeployment.metadata.name = name;
        balancerDeployment.metadata.labels.app = name;
        balancerDeployment.spec.selector.matchLabels.app = name;
        balancerDeployment.spec.template.metadata.labels.app = name;

        var configloaderArgs = balancerDeployment.spec.template.spec.containers[1].env[0].value; 

        balancerDeployment.spec.template.spec.containers[1].env[0].value= configloaderArgs + " --run.id=" + run.id;

        const config = require.main.require('./modules/config.js');

        //set images
        var rConfig = config.runtime()

        if ( !rConfig ) throw "config runtime required";
        if ( !rConfig.balancer || !rConfig.balancer.images ) throw "balancer images required";
        if ( !rConfig.balancer.images.nginx ) throw "runtime config - balancer.images.nginx required";
        if ( !rConfig.balancer.images.configloader ) throw "runtime config - balancer.images.configloader required";

        balancerDeployment.spec.template.spec.containers[0].image = rConfig.balancer.images.nginx;
        balancerDeployment.spec.template.spec.containers[1].image = rConfig.balancer.images.configloader;

        run.resources.balancer.deployment = {};
        run.resources.balancer.deployment.name = name;
        run.resources.balancer.deployment.namespace = balancerDeployment.metadata.namespace;
        
        run.resources.balancer.deployment.configTemplate = balancerDeployment;

        
        var balancerService = getBalancerServiceTemplate();
        if ( balancerService ) {
        
            balancerService.metadata.namespace = run.resources.original.namespace.name;
            balancerService.metadata.name = name;
            balancerService.spec.selector.app = name;
    
            run.resources.balancer.service = {};
            run.resources.balancer.service.name = name;
            run.resources.balancer.service.namespace = balancerService.metadata.namespace;
            run.resources.balancer.service.configTemplate = balancerService;

            return run;
        }

    }

    console.log( "attachBalancerKubeConfig - failed" );
    throw "attachBalancerKubeConfig - failed"
}

function getBalancerServiceTemplate() {
    return loadKubeConfigFileYaml( "balancer-service.yml" );
}

function getBalancerDeploymentTemplate() {
    return loadKubeConfigFileYaml( "balancer-deployment.yml" );
}

function loadKubeConfigFileYaml(filename) {
    if ( !filename ) throw "Filename required";

    var path = getKubeConfigFilePath( filename );

    console.log( "attempt to read file " + path );

    var doc = yaml.safeLoad(fs.readFileSync( path , 'utf8'));

    return doc;
}

function getKubeConfigFilePath( filename ) {
   return getKubeConfigFileDirectory() + '/' + filename;
}

function getKubeConfigFileDirectory() {

    var path = require('path');
    var appDir = path.dirname( require.main.filename );
    return appDir + '/resources/balancer-template';

}

function deleteResourceRoleInK8s(run, role, namespace) {
    console.log("deleteResourceRoleInK8s - " + role);

    if ( run.resources[role] ) //if attached
        return deleteResourcesIfTheyExistInK8s(run, role, namespace).then( function() {
            return _getRun( run.id );
        } );
    else {
        console.log("deleteResourceRoleInK8s - " + role + " - nothing to do - run has not attached");
        return run;
    }
        
}

/**
 * for a run delete its deployments and services of the resource role in K8s
 */
function deleteResourcesIfTheyExistInK8s(run, resourceRole, namespace) {

    //var actions = [];

    var actionable = [];

    ["deployment", "service"].forEach( function(kind) {

        if ( run.resources[resourceRole][kind] ) {
            actionable.push( kind );
        }

    });

    return actionable.reduce(
        (p, kind) =>
          p.then(_ => deleteIfExists( run.id, namespace, kind, resourceRole) ),
        Promise.resolve()
    );

    function deleteIfExists(runId, namespace, kind, resourceRole) {

        return _getRun( runId ).then(function(d_run) {

            var name = d_run.resources[resourceRole][kind].name;
            console.log("attempt to delete " + kind + " " + name + " in " + namespace );

            return kubeClient.deleteIfExists( namespace, kind, name ).then(function(deleted) {

                return _getRun( runId ).then(function(deletedRun) {
                    deletedRun.resources[resourceRole][kind].status = RESOURCE_STATUS.DELETED;
                    return _update( deletedRun );
                }).then( function(run) {
                    return deleted;
                });                    
                
            });

        });

    }



}


const balancerClient = require.main.require('./modules/executor/kubeBalancerClient.js');

function getBalancerLocation(run) {
    if ( run.resources.balancer && run.resources.balancer.service.status == "created" && run.resources.balancer.service.name && run.resources.balancer.service.namespace ) {
        return run.resources.balancer.service.name + "." + run.resources.balancer.service.namespace;
    }
    return null;
}

function getBalancerStatus(run) {
    var balancerLocation = getBalancerLocation( run );
    if ( !balancerLocation ) throw { message: "balancer not registered - can not do getBalancerRequestLog", exposeError: true };

    var completeStatus = {
        balancer: null,
        configloader: null
    };

    return balancerClient.getStatus( balancerLocation ).then( function( status ) {
        completeStatus.balancer = status
        return balancerLocation;
    })
    .then( balancerClient.getConfigloaderStatus ).then( function(status) {
        completeStatus.configloader = status;
        return completeStatus;
    } );
}


function getBalancerRequestLog(run) {
    var balancerLocation = getBalancerLocation( run );
    if ( !balancerLocation ) throw { message: "balancer not registered - can not do getBalancerRequestLog", exposeError: true };

    return balancerClient.getRequestLog( balancerLocation );
}

function selectNodeToUseAsSut() {
    //just get first node and assume it has resources
    return kubeClient.kubectl( "get nodes -o jsonpath='{.items[0].metadata.name}'" );
}

var sutNodeLabel = {
    key: "ywc",
    value: "sutnode"
};

/** kubectl label nodes gke-cluster-1-pool-1-e61aae7d-dfmr ywc=sutnode  - not used, I set it manually */
function setSutNode() {

    selectNodeToUseAsSut()
    .then( function(node) {
        return kubeClient.nodeLabelAdd( node, sutNodeLabel.key, sutNodeLabel.label );
    });

}

function getSutNodeSelector() {
    var selector = {};
    selector[sutNodeLabel.key] = sutNodeLabel.value;
    return selector;
}

function getSutNodeTolerations() {
    var tolerations = [{
        key: "ywc",
        operator: "Equal",
        value: "sutnode",
        effect: "NoSchedule"

    }];
    return tolerations;
}

module.exports = {
    init: init,
    createBalancer: createBalancer,
    deleteBalancer: deleteBalancer,
    getBalancerStatus: getBalancerStatus,
    getBalancerRequestLog: getBalancerRequestLog,
    deleteResourceRoleInK8s: deleteResourceRoleInK8s,
    getBalancerLocation: getBalancerLocation,
    getSutNodeSelector: getSutNodeSelector,
    getSutNodeTolerations: getSutNodeTolerations
};