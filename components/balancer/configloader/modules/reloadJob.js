const k8sServers        = require('./k8sServers.js');
const provisioning      = require('./provisioning.js');
const config            = require('./config.js');
const nginx             = require('./nginxClient.js');
const _                 = require('lodash');
const endpt             = require('./endpoints.js');
const statusController  = require('./statusController.js');
const coreClient        = require('./client/coreClient.js');


var exchangedata = {
  lastEndpoints: {}
};

function getConfig() {
  return config.runtime();
}

function getEndpointsLoadingConfig(config) {
  return config.k8s.endpointsLoading;
}

function getReloadInterval(config) {
  return parseInt( getEndpointsLoadingConfig(config).reloadInterval );
}

function changed(obj, type) {
    return !_.isEqual(obj, exchangedata.lastEndpoints[type]);
}

function saveAndRequestReload() {

  exchangedata.canary_share           = getConfig().shared_data.canary_share;
  exchangedata.sut_balancing_strategy = getConfig().shared_data.sut_balancing_strategy;
  
  provisioning.save( exchangedata );
  nginx.sendReloadRequest();

}


function loadEndpointsByType(targetService) {

  return new Promise(function(resolve, reject) {

      console.log("loading for " + targetService);

      var namespaceName = targetService.namespaceName;
      var serviceName = targetService.serviceName;

      if (!namespaceName) throw "namespaceName required";
      if (!serviceName)   throw "serviceName required";

      if ( namespaceName && serviceName ) {

        k8sServers.getEndpoints( namespaceName, serviceName, function(endpoints) {
          resolve(endpoints);
        });

      }

  });

}



async function getTargetServicesAndStoreInConfig() {
  console.log("getTargetServicesAndStoreInConfig");


  await coreClient.getRun( getConfig().run.id ) //get run of balancer
  .then(function(result) {

    if ( result.body ) {
      result = result.body; //result should be actually ready JSON body, but the conversion plugin stopped working? access body just in case
    }

    if ( result.shared_data ) {

      if (result.shared_data.readyServices ) {
        console.log("shared_data.readyServices found" );
      } else {
        console.log("shared_data.readyServices not found" );
      }

      //always overwrite current config, if response was successful (if there is an error while requesting, config will be kept)
      config.setTargetServices( result.shared_data.readyServices );

      config.setSharedData( {
        canary_share: result.shared_data.canary_share,
        sut_balancing_strategy: result.shared_data.sut_balancing_strategy
      });

    }

  }); 

}

function loadEndpoints() {

  var reloadInterval = getReloadInterval( getConfig() );

  setTimeout(function() {
    
    loadEndpointsInternal();

  }, reloadInterval);

}


function loadEndpointsInternal() {

  console.log("loadEndpoints");

  try {
    
      //load run data
      getTargetServicesAndStoreInConfig();

      //save run data to config


      var allConfig = getConfig();
      var _config = getEndpointsLoadingConfig( allConfig );
    
      if (!_config)  {
        console.log( "_config required" );
        loadEndpoints();
        return;
      }
      if (!_config.targetServices) {
        console.log( "no targetServices" );


        


        loadEndpoints();
        return;
      }

      statusController.setStatusValue( "reload_endpoints_default_attempt_last", new Date() );

      var endpointsPerType = {};

      var nextEntpointType = endpt.type.DEFAULT;

      if( !_config.targetServices[nextEntpointType] ) {
        console.log("no endpoints config for " + nextEntpointType);
        loadEndpoints();
        return;
      } 

      loadEndpointsByType( _config.targetServices[nextEntpointType] ).then(function( endpoints ) {

        if (endpoints) endpointsPerType[nextEntpointType] = endpoints;
        statusController.setStatusValue( "reload_endpoints_default_loaded", endpoints != null );

      })
      .then(function() {

        nextEntpointType = endpt.type.CANARY;

        if( !_config.targetServices[nextEntpointType] ) {
          console.log("no endpoints config for " + nextEntpointType);
          loadEndpoints();
          return;
        } 

        statusController.setStatusValue( "reload_endpoints_"+nextEntpointType+"_attempt_last", new Date() );

        return loadEndpointsByType( _config.targetServices[nextEntpointType] ).then(function( endpoints ) {
          if (endpoints) endpointsPerType[nextEntpointType] = endpoints;
          statusController.setStatusValue( "reload_endpoints_"+nextEntpointType+"_loaded", endpoints != null );
        });

      })
      .then(function() {

        nextEntpointType = endpt.type.BASELINE;

        if( !_config.targetServices[nextEntpointType] ) {
          console.log("no endpoints config for " + nextEntpointType);
          loadEndpoints();
          return;
        } 

        statusController.setStatusValue( "reload_endpoints_"+nextEntpointType+"_attempt_last", new Date() );

        return loadEndpointsByType( _config.targetServices[nextEntpointType] ).then(function( endpoints ) {
          if (endpoints) endpointsPerType[nextEntpointType] = endpoints;
          statusController.setStatusValue( "reload_endpoints_"+nextEntpointType+"_loaded", endpoints != null );
        });

      })
      .then(function() {

        var changesAvailable = false;

        Object.keys( endpointsPerType ).forEach( function(endpointType) {

          var endpoints = endpointsPerType[endpointType];

          if ( endpoints != null && changed( endpoints, endpointType ) ) {
            console.log( endpointType + ' servers changed', endpoints);
            exchangedata.lastEndpoints[endpointType] = endpoints;
            changesAvailable = true;
          }

        });
        
        if (changesAvailable) saveAndRequestReload();
        loadEndpoints();

      })
      .catch(function(err) {

        console.log(err);
        loadEndpoints();

      });

  } catch (error) {
    console.log(error);
    loadEndpoints();
  }

}

var start = function() {
  loadEndpointsInternal();
};

module.exports = {

    start: start
  
};