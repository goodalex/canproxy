/**
 *  Intent: act as scheduler that stops performance assessments runs after the runtime,
 *  currently performance run is stopped with setTimeout ... which breaks the stateless-ness of the whole core service
 *  NOT USED - NOT IMPLEMENTED
 *
 *
 */

const runs = require.main.require('./modules/runs/runsController.js');

const INTERVAL_SECONDS = 3;

function start() {
  startJobInternal();
}

function startJobInternal() {
  setTimeout( job, INTERVAL_SECONDS );
}

function job() {

  runs.getAll().then( function(arr) {

    //TODO implement

    startJobInternal();
  })
  .catch(function(err) {
    startJobInternal();
    throw err;
  });


}

module.exports = {
    start: start
};
