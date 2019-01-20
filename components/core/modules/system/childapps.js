/**
   Map Express apps to URI paths of the mainapp
**/
const rest              = require.main.require('./modules/system/abstractRestApp.js');
const runsRestApp       = require.main.require('./modules/runs/runsRestApp.js');
const statusController  = require.main.require('./modules/status/statusController.js');

module.exports = {

    create: function() {

        return [
            ['/api/v1/runs', runsRestApp.createApp() ],
            ['/api/v1/statuses', rest.createAppForController( statusController ) ]
        ];

    }

};
