const consolestamp  = require('console-stamp');
const argv = require('minimist')(process.argv.slice(2));
const validate = require("validate.js");
const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');
const statusController  = require('./statusController.js');


var config = null;


function init() {

    //logging
    consolestamp(console, '[HH:MM:ss.l]');

    config = {
        default: {},
        input: argv,
        runtime: {}
    };

    copyAllFields( config.default, config.runtime );
    copyAllFields( config.input, config.runtime );
}

function copyAllFields(source, target) {
    Object.keys( source ).forEach( function(key) {
        target[key] = source[key];
    });
}


function createMain() {

    var input = null;

    var id = "main"; //uuidv4();
    var created = new Date();

    var item = {
        id: id,
        created: created.getTime(),
        created_formatted: created.toISOString(),
        created_by_input: input,
        status: "created"

    };

    map[id] = item;
    
    return item;
}

function get(id) {
    
    if ( id == 'main') {
        return config;
    }

    return null;
}

var updateConstraints = {
    "runtime.k8s.endpointsLoading.targetServices.default.serviceName": {
        presence: true
    },
    "runtime.k8s.endpointsLoading.targetServices.default.namespaceName": {
        presence: true
    }
};

function validationErrorObj(validationError) {
   return { validationError: validationError }
}

const CONFIG_STATUS_KEY = "config_update_processing_status";
function setConfigProcessingStatus(value) {
    statusController.setStatusValue( CONFIG_STATUS_KEY, value );
}

function setTargetServices(newTargetServices) {
    //null allowed
    config.runtime.k8s.endpointsLoading.targetServices = newTargetServices;
}

function setSharedData(shared_data) {
    if (!shared_data) throw "shared_data cannot be null";
    if (!shared_data.canary_share) throw "shared_data.canary_share cannot be null";
    config.runtime.shared_data = shared_data;
}

function update(id, input) {

    var success = false;

    const statusController  = require('./statusController.js');

    statusController.setStatusValue( "config_update_attempt_last", new Date() );

    var item = get(id);

    if ( item != null) {

        if ( id == 'main' ) {
            var validationError = validate( input, updateConstraints );
            if ( validationError ) {
                return validationErrorObj( validationError );
            }
        
            //prepare
            var inputTargetServices = input.runtime.k8s.endpointsLoading.targetServices;
            var targetServices = item.runtime.k8s.endpointsLoading.targetServices || {};
        
            targetServices.default = {};
            targetServices.default.serviceName      = inputTargetServices.default.serviceName;
            targetServices.default.namespaceName    = inputTargetServices.default.namespaceName;
    
            targetServices.canary = {};
            targetServices.canary.serviceName      = inputTargetServices.canary.serviceName;
            targetServices.canary.namespaceName    = inputTargetServices.canary.namespaceName;

            targetServices.baseline = {};
            targetServices.baseline.serviceName      = inputTargetServices.baseline.serviceName;
            targetServices.baseline.namespaceName    = inputTargetServices.baseline.namespaceName;

            item.runtime.k8s.endpointsLoading.targetServices = targetServices;
            config = item;

            success = true;
            statusController.setFunctionSuccess( "config_update", success );
            setConfigProcessingStatus( "input_received" )

            return item;
        }

    }
    statusController.setFunctionSuccess( "config_update", success );
    return null;

}

module.exports = {

    update: update,
    get: get,
    init: init,
    runtime: function() {
        return config.runtime;
    },
    setConfigProcessingStatus: setConfigProcessingStatus,
    setTargetServices: setTargetServices,
    setSharedData: setSharedData
  
};