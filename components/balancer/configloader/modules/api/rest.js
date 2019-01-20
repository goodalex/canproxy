const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const morgan = require('morgan');


var resourcesPath = "";

function getPath(subpath) {
    var path = resourcesPath;

    if ( subpath != null ) {
        path += "/" + subpath;
    }

    return path;
}

function onRequest(req) {

}

var path            = getPath();
var singleObjPath   = getPath( ':id' );

module.exports.path             = path;
module.exports.singleObjPath    = singleObjPath;
module.exports.onRequest        = onRequest;


function respondIfError(obj, res) {

    if ( obj.validationError ) {
        res.status( 400 ).send( obj );
        return true;
    }

    if ( obj.notFoundError ) {
        res.status( 404 ).send( obj );
        return true;
    }

    return false;
}

/**
 * checks if object has error that can be mapped to a status 
 * and attaches error if so
 */
module.exports.respondIfError = respondIfError;

/**
 * 
 * version: 20180510-2128
 * 
 * Creates a rest API which is a wrapper for a controller.
 * 
 * Maps HTTP requests to following functions, if they exist on the controller:
 * get(id), getAll, create(input), update(id, input),delete(id)
 * 
 * Register controller like this:
 * app.use( '/api/products', rest.createAppForController( productsController ) );
 * 
 * @param {*} controller 
 */
module.exports.createAppForController = function(controller) {

    const app = express();

    app.use( morgan('tiny') );
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());



    console.info( 'api injectRoutes, path: ' + path + ', singleObjPath: ' + singleObjPath );

    if (controller.create) {
        app.post( path, function(req, res) {

            onRequest( req );
        
            console.info( JSON.stringify( req.body)  );

            var obj = controller.create( req.body );
    
            if ( obj != null ) {
                
                if ( respondIfError( obj, res ) ) return;
    
                res.status( 201 ).send( obj );
                return;
            }

            res.status( 500 ).send();
            return;

        } );
    }

    if (controller.getAll) {
        app.get( path, function(req, res) {

            onRequest( req );
        
            var obj = controller.getAll();
    
            res.send( obj );
            
        } );
    }

    if (controller.get) {
        app.get( singleObjPath, function(req, res) {

            onRequest( req );
        
            var obj = controller.get( req.params.id );
    
            res.send( obj );

        } );
    }

    if (controller.update) {
        app.put( singleObjPath, function(req, res) {
                onRequest( req );
                
                var obj = controller.update( req.params.id, req.body );

                if ( obj != null ) {
                
                    if ( respondIfError( obj, res ) ) return;
        
                    res.status( 200 ).send( obj );
                    return;
                }

                res.status( 500 ).send();
                return;

        } );
    }

    if (controller.updateStatus) {
        app.put( singleObjPath + "/status", function(req, res) {
                onRequest( req );
                
                var obj = controller.updateStatus( req.params.id, req.body );

                if ( obj != null ) {
                
                    if ( respondIfError( obj, res ) ) return;
        
                    res.status( 200 ).send( obj );
                    return;
                }

                res.status( 500 ).send();
                return;

        } );
    }

    if (controller.delete) {
        app.delete( singleObjPath, function(req, res) {
                onRequest( req );
                
                controller.delete( req.params.id );

        } );
    }

    /**
     * append custom rest functions
     */
    if (controller.rest) {
        controller.rest.forEach( function(fnc) {
            fnc(app, path, singleObjPath, onRequest);
        });
    }

    return app;

};