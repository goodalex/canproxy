const fs        = require('fs');
const endpt     = require('./endpoints.js');
const statusController  = require('./statusController.js');

const provisioning = {
    dir: "/provisioning",
    file_upstream_endpoints: "upstream_endpoints.json"
};

function save(object) {

    var objectStr = JSON.stringify( object )
    
    var filepath = provisioning.dir + "/" + provisioning.file_upstream_endpoints;

    fs.writeFile( filepath, objectStr, function(err) {
        
        var isSuccess = false;

        if( err ) {
            return console.log( err );
        } else {
            isSuccess = true;
            console.info( " The file was saved! path: " + filepath);
            console.info( objectStr );

            
            statusController.setStatusValue( "provisioning_endpoints_saved", objectStr );
        }
        
        statusController.setFunctionSuccess( "provisioning_endpoints_save", isSuccess );
        
    });

}


function convertToProvisioning(data) {

    var created = new Date();

    //prepare obj
    var obj = {
      meta: {
        created: created.getTime(),
        created_formatted: created.toISOString()
      },
      data: {
        upstream_servers: {
            default: null,
            baseline: null,
            canary: null
        },
        canary_share: data.canary_share,
        sut_balancing_strategy: data.sut_balancing_strategy
      }
    };
  
    setEndpointsTypeToObject( data.lastEndpoints, endpt.type.DEFAULT, obj );
    setEndpointsTypeToObject( data.lastEndpoints, endpt.type.BASELINE, obj );
    setEndpointsTypeToObject( data.lastEndpoints, endpt.type.CANARY, obj );

    return obj;

}

function setEndpointsTypeToObject(endpoints, type, targetObj) {

    if (endpoints[type]) {
        targetObj.data.upstream_servers[type] = endpoints[type];
    }

}

module.exports.save = function(data) {

    var converted = convertToProvisioning( data );
    save( converted );

};