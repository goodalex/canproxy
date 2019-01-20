const prom = require('./prom.js');  
const k8s = require('@kubernetes/client-node');
var k8sApi = k8s.Config.defaultClient();
const statusController  = require('./statusController.js');

function getEndpoints(namespaceName, serviceName, callback) {

    statusController.setStatusValue( "k8s_listNamespacedEndpoints_attempt_last", new Date() );

    var pretty = false;
    var _continue = null;
    var fieldSelector = "metadata.name=" + serviceName;
    var includeUninitialized = false;
    var labelSelector = null; // deprecated "ywc.role=original-clone";
    var limit = 1000;

    k8sApi.listNamespacedEndpoints( namespaceName, pretty, _continue, fieldSelector, 
        includeUninitialized, labelSelector, limit)
        .then((res) => {

            //console.info( JSON.stringify(res.body, null, 2) );

            var endpoints = getEndpointsFromResponse(res);
            
            if ( endpoints != null ) statusController.setFunctionSuccess( "k8s_listNamespacedEndpoints", true );

            callback( endpoints );

        }).catch((err) => {
            // Handle any error that occurred in any of the previous
            // promises in the chain.
            console.log(err);
            statusController.setFunctionSuccess( "k8s_listNamespacedEndpoints", false );

        });

}

/** deprecated */
function getEndpointsForAllNamespaces(callback) {

    k8sApi.listEndpointsForAllNamespaces( null, "metadata.namespace=webservice", false, null, 100, true)
        .then((res) => {

            //console.info( JSON.stringify(res.body, null, 2) );

            var endpoints = getEndpointsFromResponse(res);
            prom.set_function_success('k8s_servers_get', 1);

            callback( endpoints );

        }).catch((err) => {
            // Handle any error that occurred in any of the previous
            // promises in the chain.
            console.log(err);
            prom.set_function_success('k8s_servers_get', 0);

        });

}





function getEndpointsFromResponse(res) {

    var endpoints = {

        meta: {},
        endpoints: []

    };
    var retrieved = false; //differentiate between successfull retrieve of zero endpoints and failed retrive

    //console.log(res.body);
    if (res.body.items) {
        res.body.items.forEach(function(item){

            endpoints.meta.serviceName = item.metadata.name;
            endpoints.meta.namespaceName = item.metadata.namespace;

            if (item.subsets) {
                item.subsets.forEach(function(subset){
                
                    var sPort = null;
                    if (subset.ports) {
                        subset.ports.forEach(function(port){


                            sPort = port; //TODO support multiple ports

                        });
                    }
                    
                    //console.log(subset);
                    if (sPort !== null && subset.addresses !== undefined) {
                        
                        retrieved = true; 

                        subset.addresses.forEach(function(address){


                            endpoints.endpoints.push({
                                host: address.ip,
                                port: sPort.port
                            });

                        });
                    }


                });
            }

        });
    }

    if (retrieved && endpoints != null) {
        return endpoints;
    }

    console.info( "failed to retrieve" );
    console.error( "res", JSON.stringify( res.body ) );
    return null;
}

module.exports = {

    getEndpoints: getEndpoints
  
};