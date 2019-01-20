/*

Rest API for runs. Wraps functions of runController to API calls and maps internal errors to HTTP status codes.

*/


const rest           = require('./../system/abstractRestApp.js');
const controller     = require('./runsController.js');

function createApp() {

    var app = rest.createAppForController( controller );

    app.post( rest.singleObjPath + "/preparation/start", function(req, res) {
        rest.onRequest( req );

        controller.preparationStart( req.params.id )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 202 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {
                console.error(err);
                rest.onCatchError(err, res);
            });

    } );

    app.post( rest.singleObjPath + "/cleanup/start", function(req, res) {
        rest.onRequest( req );

        controller.cleanupStart( req.params.id )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 200 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {
                console.error(err);
                rest.onCatchError(err, res);
            });

    } );

    app.post( rest.singleObjPath + "/interception/start", function(req, res) {
        rest.onRequest( req );

        controller.interceptionStart( req.params.id )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 202 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {
                console.error(err);
                rest.onCatchError(err, res);
            });

    } );

    app.post( rest.singleObjPath + "/interception/stop", function(req, res) {
        rest.onRequest( req );

        controller.interceptionStop( req.params.id )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 202 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {
                console.error(err);
                rest.onCatchError(err, res);
            });

    } );

    app.get( rest.singleObjPath + "/report", function(req, res) {
        rest.onRequest( req );

        controller.getReport( req.params.id, req.query )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 200 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {

                if ( err.exposeError ) {
                    res.status( 500 ).send( err );
                } else {
                    console.error(err);
                    rest.onCatchError(err, res);
                }


            });

    } );

    app.get( rest.singleObjPath + "/balancer", function(req, res) {
        rest.onRequest( req );

        controller.getBalancerStatus( req.params.id )
            .then( function(obj) {

                if ( obj != null ) {

                    if ( !rest.respondIfError( obj, res ) ) {
                        res.status( 200 ).send( obj );
                    }

                } else {
                    res.status( 500 ).send( {error: "object is null"} );
                }

            }).catch( function(err) {

                if ( err.exposeError ) {
                    res.status( 500 ).send( err );
                } else {
                    console.error(err);
                    rest.onCatchError(err, res);
                }


            });

    } );

    app.use( rest.singleObjPath + "/balancer/management/:subpath", function(req, res) {
        rest.onRequest( req );
        var path = "/" + req.params.subpath;
        controller.balancerPipeManagementRequest( req.params.id, req, res, path );
    } );

    return app;

}




module.exports = {

    createApp: createApp

};
