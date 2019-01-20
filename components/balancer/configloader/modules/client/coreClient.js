const config = require('./../config.js');
const request = require('request');
const validate = require("validate.js");

function getServerLocation() {
    return config.runtime().core.location;
}

function getPath( subpath ) {
    return getServerLocation() + '/api/v1' + subpath ;
}

function getRun(id) {

    return new Promise(function(resolve, reject) {

        var url = getPath( '/runs/' + id );

        request.get( { url: url, json: true, 
            headers: {
                "Accept": "application/json"
            }
        }, function (err, res, body) {

            if (err) {
                reject(err);
            } else {

                var statusCodeStr = res.statusCode+"";
                if (statusCodeStr.startsWith( "2" )) {
                    resolve( res );
                } else {
                    reject( {
                        error: 'statusCode is ' + res.statusCode,
                        body: res.body,
                        requestUrl: url
                    } );
                }
            
            }

        });

    });

}

module.exports = {

    getRun: getRun
  
};