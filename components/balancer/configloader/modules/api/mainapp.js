const os            = require("os");
const express       = require('express');

const prom          = require('./../prom.js');
const rest          = require('./rest.js');

const config            = require('./../config.js');
const statusController  = require('./../statusController.js');



function getConfig() {
    return config.runtime();
}

function start(message) {

    const app = express();

    var hostname = os.hostname();
    const handler = (req, res) => {
  
        console.log(`server`, req.method, req.url);
        res.send( "message: " + message + ", hostname: " + hostname );
        
    };

    //metrics
    prom.injectMetricsRoute(app); //must be before any '*' handler 
    prom.startCollection();
    app.use(prom.requestCounters);  
    app.use(prom.responseCounters);

    //api
    app.use( '/api/configs', rest.createAppForController( config ) );
    app.use( '/api/statuses', rest.createAppForController( statusController ) );

    app.get( '/', handler);
    app.listen( getConfig().port );

}

module.exports = {

    start: start
  
};