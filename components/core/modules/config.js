const consolestamp  = require('console-stamp');
const minimist      = require('minimist');

const argv = minimist(process.argv.slice(2));

var config = null;

function init() {

    //logging
    consolestamp(console, '[HH:MM:ss.l]');

    //functional
    config = {
        input: argv,
        runtime: {}
    };

    config.runtime = config.input;
   
    config.runtime.mongodb = config.runtime.mongodb || {};
    config.runtime.mongodb.dbName = 'ywc'

    console.info( "config.runtime: \n" + JSON.stringify( config.runtime, null, 2) );

}

module.exports = {

    init: init,
    runtime: function() {
        return config.runtime;
    }
  
};