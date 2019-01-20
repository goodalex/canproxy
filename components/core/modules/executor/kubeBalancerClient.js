/*


Client to access the ywc balancer instance that belongs to a run and runs within a pod in Kubernetes.
*/


const config = require('./../config.js');
const request = require('request');
const validate = require("validate.js");

function getManagementLocation(serverLocation) {
    return "http://" + serverLocation + ":81";
}

function getConfigloaderLocation(serverLocation) {
    return "http://" + serverLocation + ":90";
}

function getHttpResponseBodyAsJson( url ) {

    return new Promise(function(resolve, reject) {

        console.log( 'balancerClient - request URL ' + url );

        request.get( {
            url: url,
            headers: {
                "Accept": "application/json"
            },
            json:true
        },
        function (err, res, body) {
            if (err) {
                reject(err);
            } else {

                var statusCodeStr = res.statusCode+"";
                if (statusCodeStr.startsWith( "2" )) {
                    resolve( res.body );
                } else {
                    reject( {
                        error: 'statusCode is ' + res.statusCode,
                        requestUrl: url
                    } );
                }

            }
        });

    });

}

function validateServerLocation(serverLocation) {
    if ( !serverLocation ) throw "balancerClient - server location required";
}

function pipeManagementRequest(serverLocation, path, req, res) {
    validateServerLocation( serverLocation );

    var url = getManagementLocation( serverLocation ) + path;
    console.log('pipeManagementRequest to url ' +  url );
    req.pipe( request( { qs:req.query, uri: url } ) ).pipe( res );
}

function getRequestLog(serverLocation, minIndex) {
    validateServerLocation( serverLocation );

    return getHttpResponseBodyAsJson( getManagementLocation( serverLocation ) + "/requestlog" );
}

function getStatus(serverLocation) {
    validateServerLocation( serverLocation );

    return getHttpResponseBodyAsJson( getManagementLocation( serverLocation ) + "/status" );
}

function getConfigloaderStatus(serverLocation) {
    validateServerLocation( serverLocation );

    return getHttpResponseBodyAsJson( getConfigloaderLocation( serverLocation ) + "/api/statuses/main" );
}

module.exports = {

    getRequestLog: getRequestLog,
    getStatus: getStatus,
    getConfigloaderStatus: getConfigloaderStatus,
    pipeManagementRequest: pipeManagementRequest

};
