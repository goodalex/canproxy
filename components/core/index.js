/*
  entrypoint
*/


//modules
const lifecycle     = require('./modules/system/lifecycle.js');
const mainapp       = require('./modules/system/mainapp.js');

const childapps     = require('./modules/system/childapps.js');
const config        = require('./modules/config.js');

const mongodb       = require('./modules/client/mongodb.js');

var appname = 'core';

console.log( appname + ' starting' );

//init
config.init();
lifecycle.init();
mongodb.init();

//start
mainapp.start( appname, config.runtime().port, childapps.create() );

console.log( appname + 'started' );
