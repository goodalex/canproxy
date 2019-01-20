const os            = require("os");
const express       = require('express');

const prom          = require('./prom.js');
const rest          = require('./abstractRestApp.js');


function start(message, port, childApps) {

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

    childApps.forEach(element => {
        app.use( element[0], element[1] );
    });
    
    app.use('/', express.static( getDashboardDir() + '/'));
    //app.get( '/', handler);
    app.listen( port );

}

function getDashboardDir() {
    const path = require('path');
    var appDir = path.dirname( require.main.filename );
    return appDir + '/resources/dashboard-wwwroot';
}

module.exports = {

    start: start
  
};