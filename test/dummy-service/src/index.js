const express = require('express');
const os = require("os");
const prom = require('./modules/prom.js');  

var hostname = os.hostname();

var argv = require('minimist')(process.argv.slice(2));

const app1 = express();



app1.use(prom.requestCounters);  
prom.injectMetricsRoute(app1);
prom.startCollection();

console.log( "argv ", argv );

const handler = (req, res) => {
  //handle request

  var responseDelay = 0;
  var responseBody = "test service V2 message: " + argv.message + ", hostname: " + hostname;

  var modeCanaryResponseDelay = req.query.mode_canary_response_delay;
  
  //calculate total request delay - simluates processing time
  //calculate the delay independent of if canary mode is activated or not, so that for such a request the canary and baseline have both same processing procedure 
  // -->  decide in the last moment possible whether the canary delay should be used
  if ( modeCanaryResponseDelay ) {
  
    var additionalDelay = getDelay( modeCanaryResponseDelay );
  
    if (req.query.debug) {
      console.log('responseDelay with modeCanaryResponseDelay', responseDelay);
    }

    if ( additionalDelay && additionalDelay != 0 ) {
      var newResponseDelay = responseDelay + additionalDelay;
      var oldResponseDelay = responseDelay + 0;
      if ( isCanaryModeEnabled() ) {
        responseDelay = newResponseDelay;
      } else {
        responseDelay = oldResponseDelay;
      }
    } 

  } 
  
  var allRequestsResponseDelay = getAllRequestsResponseDelay();

  if ( allRequestsResponseDelay ) { 
    var additionalDelay = getDelay( allRequestsResponseDelay ); 

    if (req.query.debug) {
      console.log('responseDelay with allRequestsResponseDelay', responseDelay);
    }

    responseDelay = responseDelay + additionalDelay;
  }

  if (req.query.debug) {
    console.log( responseDelay );
  }

  responseSendDelayedAsync( res, responseBody, responseDelay );

};


app1.get('/metrics', (req, res) => {
    res.set('Content-Type', Prometheus.register.contentType);
    res.end(Prometheus.register.metrics());
  });



app1.get('*', handler).post('*', handler);


function isCanaryModeEnabled() {
  return argv.mode && argv.mode == "canary";
}

function getAllRequestsResponseDelay() {

  if ( argv.responseDelayAllRequests ) {
    return argv.responseDelayAllRequests;
  }

  return null;
}

function randomIntFromInterval(min,max) {
    return Math.floor( Math.random() * (max-min+1) + min );
}

function responseSendDelayedAsync(res, responseBody, delay) {

  setTimeout( function() { 
    res.send(responseBody) 
  }, delay);

}

/**
 * 
 * @param {*} delayStr Delay in milliseconds. Accepts fixed value or ranges. E.g. "1000" or "1200-2200".
 */
function getDelay(delayStr) {

  var delimiter = "-";

  if ( (typeof delayStr === 'string' || delayStr instanceof String) && delayStr.indexOf( delimiter ) !== -1 ) { 
    //contains delimiter, so its a range
    var range = delayStr.split( delimiter );
    return randomIntFromInterval( parseInt(range[0]) , parseInt(range[1]) );
  } else {
    //fixed value
    return parseInt( delayStr );
  }

}

app1.listen(argv.port);
console.log('server started');

