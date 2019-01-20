/**
 * Monitoring with Prometheus
 * Uses: https://github.com/siimon/prom-client
 * Original code from: https://community.tibco.com/wiki/monitoring-your-nodejs-apps-prometheus
 * Newly added requires
 */
var Register = require('prom-client').register;
var Counter = require('prom-client').Counter;
var Histogram = require('prom-client').Histogram;
var Summary = require('prom-client').Summary;
var ResponseTime = require('response-time');
var Gauge = require('prom-client').Gauge;


var function_success_gauges = {};
var function_success_last_counter = {};

module.exports.function_success = function_success = new Gauge({
    name: 'function_success',
    help: 'Is 1 if the last execution of a function was successful',
    labelNames: ['function_name']
});

module.exports.function_success_last = function_success_last = new Gauge({
    name: 'function_success_last',
    help: 'Last successful execution of a function',
    labelNames: ['function_name']
});

module.exports.set_function_success = function (functionname, value) {

    //function_success_gauges[name] = function_success_gauges[name] ||

    if ( value == 1 ) {
        var now = new Date();
        function_success_last.set({ function_name: functionname }, now.getTime() );
    }

    function_success.set({ function_name: functionname }, value);
}

/**
 * A Prometheus counter that counts the invocations of the different HTTP verbs
 * e.g. a GET and a POST call will be counted as 2 different calls
 */
module.exports.http_requests_total = http_requests_total = new Counter({
    name: 'http_requests_total',
    help: 'Number of requests made',
    labelNames: ['method']
});

/**
 * A Prometheus counter that counts the invocations with different paths
 * e.g. /foo and /bar will be counted as 2 different paths
 */
module.exports.pathsTaken = pathsTaken = new Counter({
    name: 'pathsTaken',
    help: 'Paths taken in the app',
    labelNames: ['path']
});

/**
 * A Prometheus summary to record the HTTP method, path, response code and response time
 */
module.exports.responses = responses = new Summary({
    name: 'responses',
    help: 'Response time in millis',
    labelNames: ['method', 'path', 'status']
});

/**
 * This funtion will start the collection of metrics and should be called from within in the main js file
 */
module.exports.startCollection = function () {
    console.log(`Starting the collection of metrics, the metrics are available on /metrics`);
    require('prom-client').collectDefaultMetrics();
};

/**
 * This function increments the counters that are executed on the request side of an invocation
 * Currently it increments the counters for numOfPaths and pathsTaken
 */
module.exports.requestCounters = function (req, res, next) {
    if (req.path != '/metrics') {
        http_requests_total.inc({ method: req.method });
        pathsTaken.inc({ path: req.path });
    }
    next();
}

/**
 * This function increments the counters that are executed on the response side of an invocation
 * Currently it updates the responses summary
 */
module.exports.responseCounters = ResponseTime(function (req, res, time) {
    if(req.url != '/metrics') {
        responses.labels(req.method, req.url, res.statusCode).observe(time);
    }
})

/**
 * In order to have Prometheus get the data from this app a specific URL is registered
 */
module.exports.injectMetricsRoute = function (App) {
    App.get('/metrics', (req, res) => {
        res.set('Content-Type', Register.contentType);
        res.end(Register.metrics());
    });
};
