//modules
const config        = require('./modules/config.js');
const lifecycle     = require('./modules/lifecycle.js');
const reloadJob     = require('./modules/reloadJob.js');
const mainapp       = require('./modules/api/mainapp.js');

var appname = 'manager';

console.log( appname + ' starting 1' );

//init
config.init();
lifecycle.init();

console.info( JSON.stringify( config.runtime(), null, 2) );

//start
reloadJob.start();
mainapp.start( appname );

console.log( appname + 'started' );