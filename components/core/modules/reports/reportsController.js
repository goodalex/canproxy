/**
 *
 * Creates report based on a request log, including statistics such as:
 *  - request counts per canary and baseline (and default)
 *  - percentiles
 *  - comparison of workloads
 *
 * Major counters and sub-reports are divided into separate modules.
 *
 */

const requestUriCounter = require('./requestUriCounter.js');
const workloadComparisonReport = require('./workloadComparisonReport.js');

function createReport(runid, queryParams) {

    const runsController = require.main.require('./modules/runs/runsController.js');

    return runsController.getRequestLog( runid ).then( function(responseBody) {
        var rawRequests = responseBody.entryList; //assumes a array sorted ascending by array[i].response_time_seconds

        var output = {
            meta: null,
            reports: [],
            export: {
                csv: ""
            }
        };

        var filterOptions = {
            request_time_min: queryParams.request_time_min,
            request_time_max: queryParams.request_time_max,
            skip_seconds: queryParams.skip_seconds
        };

        var filteredRequests = filterItems( rawRequests, filterOptions );

        output.meta = filteredRequests.meta;

        var bucket_grouping_by_time_period_seconds = [60];
        if ( queryParams.bucket_grouping_by_time_period_seconds ) {
            console.log( queryParams.bucket_grouping_by_time_period_seconds );
            var delimiter = ",";
            bucket_grouping_by_time_period_seconds = queryParams.bucket_grouping_by_time_period_seconds.split( delimiter );
        }

        bucket_grouping_by_time_period_seconds.forEach( function( next_grouping ) {

            var groupingOptions = {
                bucket_grouping_by_time_period_seconds: next_grouping
            };

            var r = createReportByList( filteredRequests.data , groupingOptions );
            output.reports.push( r );

            //merge exports
            output.export.csv = output.export.csv + "\n;\n" + r.export.csv;

        });

        var metaexport = "meta.data_filtered;";

        Object.keys( output.meta.data_filtered ).forEach( function(key) {
            var value = output.meta.data_filtered[key];
            metaexport = metaexport + key + ";"+value+";\n"
        });

        output.export.csv =
            metaexport
            + "\n;\n"
            + output.export.csv;

        return output;
    });

}

//filter items and generate raw data meta information
function filterItems(items, options) {

    var filtered = {
        meta: {
            data_raw: {
                request_count_total: 0,
                first_request_time: null,
                last_request_time: null
            },
            data_filtered: {
                request_count_total: 0,
                first_request_time: null,
                last_request_time: null,
                canary_request_count_total: 0,
                baseline_request_count_total: 0
            }
        },
        data: []
    };

    var meta_filtered = filtered.meta.data_filtered;

    var firstElem = null;
    items.forEach(element => {
        if ( !firstElem ) firstElem = element;

        ///conversion
        element.request_start_time_millis = element.request_start_time*1000;

        //raw data stats
        filtered.meta.data_raw.request_count_total++;

        if ( !filtered.meta.data_raw.first_request_time ) {
            filtered.meta.data_raw.first_request_time = element.request_start_time_millis;
            filtered.meta.data_raw.first_request_time_formattedStr = new Date( filtered.meta.data_raw.first_request_time ).toISOString();
        }
        filtered.meta.data_raw.last_request_time = element.request_start_time_millis;

        //filter
        if ( options.skip_seconds && element.request_start_time_millis < ( firstElem.request_start_time_millis + options.skip_seconds*1000 ) ) {
            return;
        }
        if ( options.request_time_min && element.request_start_time_millis < options.request_time_min ) {
            return;
        }
        if ( options.request_time_max && element.request_start_time_millis > options.request_time_max ) {
            return;
        }

        filtered.data.push( element );

        //filtered meta data
        meta_filtered.request_count_total++;

        if ( !meta_filtered.first_request_time ) {
            meta_filtered.first_request_time = element.request_start_time_millis;
            meta_filtered.first_request_time_formattedStr = new Date( meta_filtered.first_request_time ).toISOString();
        }
        meta_filtered.last_request_time = element.request_start_time_millis;

        if ( element.endpoint_type == "baseline" ) {
            meta_filtered.baseline_request_count_total++;
        }
        if ( element.endpoint_type == "canary" ) {
            meta_filtered.canary_request_count_total++;
        }


    });
    filtered.meta.data_raw.last_request_time_formattedStr = new Date( filtered.meta.data_raw.last_request_time ).toISOString();
    meta_filtered.last_request_time_formattedStr = new Date( meta_filtered.last_request_time ).toISOString();

    return filtered;
}


function createReportByList(requests, options) {

    const runsController = require.main.require('./modules/runs/runsController.js');


        var report = {
            options: options,
            request_count_total: requests.length,
            bucket_count: null,
            buckets: [],
            export: {}
        };

        //create buckets
        var requestBuckets = null;
        if ( options.bucket_grouping_by_time_period_seconds ) {
            requestBuckets = toBucketsGroupByTimePeriod( requests, options.bucket_grouping_by_time_period_seconds );
        } else {
            requestBuckets = toBucketsOneBucket( requests );
        }

        //create report per bucket
        requestBuckets.forEach( function( bucket ) {

            var bReport = createBucketReport( bucket, function(element) {
                //custom
            } );

            report.buckets.push( bReport );

        });

        report.bucket_count = report.buckets.length;

        report.export.csv = convertToCsvExport( report );

        return report;



    function createBucket(name) {
        return {
            meta: {
                name: name
            },
            entryList: []
        };
    }

    function createPeriodBucket(bucketStartTimestamp) {
        var b = createBucket( "period" );
        b.meta.start_time_stamp = bucketStartTimestamp;
        b.meta.start_time_stamp_formattedStr = new Date(bucketStartTimestamp).toISOString();
        return b;
    }

    /**
     * ust put everything to one bucket fot the moment
     *
     *
     * @param {*} requests
     */
    function toBucketsOneBucket(requests) {

        //just put everything to one bucket fot the moment
        var buckets = [];

        requests.forEach(element => {
            buckets[0] = buckets[0] || createBucket( "all" );
            buckets[0].entryList.push( element );
        });

        return buckets;

    }

    /**
     * sort requests into buckets of time periods, e.g. 10 second periods
     * @param {*} requests
     * @param {*} timePeriod
     */
    function toBucketsGroupByTimePeriod(requests, timePeriodSeconds) {

        var buckets = [];

        var bucketIndex = -1;
        var bucketStartTimestamp = null;

        requests.forEach(element => {

            //console.log('element', JSON.stringify(element), 'bucketStartTimestamp ' + bucketStartTimestamp + ', timePeriodSeconds ' + timePeriodSeconds);
            if ( bucketStartTimestamp == null || element.request_start_time_millis > bucketStartTimestamp+timePeriodSeconds*1000 ) {
                bucketStartTimestamp = element.request_start_time_millis;
                bucketIndex++;
            }

            buckets[bucketIndex] = buckets[bucketIndex] || createPeriodBucket( bucketStartTimestamp );
            buckets[bucketIndex].entryList.push( element );

        });

        return buckets;

    }

    function createBucketReport(bucket, onEachElement) {

        var percentile = require('percentile');

        // report template; the following values will be included
        var report = {
            meta: bucket.meta,
            request_count_total: 0,
            request_count_not_reportable: 0,
            request_count_per_endpoint: {},
            request_count_per_endpoint_relative: {},
            request_count_per_endpoint_type: {},
            request_count_per_endpoint_type_relative: {},
            endpoint_types: {
                // "type1": { percentile: {} }
                // "type2": { percentile: {} }
                // "type3": { percentile: {} }
            }
        };

        // maps to enable inbetween calculations
        var _calc_elementsPerEndpointType = {};
        var _calc_urlCountersPerEndpointType = {};

        //process all elements - create counters and resort elements for further calculations
        bucket.entryList.forEach(element => {

            report.request_count_total++;

            //skip if garbage
            if (element.response_time_seconds == null || element.response_time_seconds == "") {
                report.request_count_not_reportable++;
                return;
            }

            //add converted response time
            element.response_time_milliseconds = Math.round( parseFloat( element.response_time_seconds ) * 1000 );

            //basic counters
            report.request_count_per_endpoint[element.endpoint] = report.request_count_per_endpoint[element.endpoint] || 0 ;
            report.request_count_per_endpoint[element.endpoint]++;

            report.request_count_per_endpoint_type[element.endpoint_type] = report.request_count_per_endpoint_type[element.endpoint_type] || 0 ;
            report.request_count_per_endpoint_type[element.endpoint_type]++;

            //populate calculation maps and helpers
            _calc_elementsPerEndpointType[element.endpoint_type] = _calc_elementsPerEndpointType[element.endpoint_type] || [];
            _calc_elementsPerEndpointType[element.endpoint_type].push( element );

            //advanced counters
            _calc_urlCountersPerEndpointType[element.endpoint_type] = _calc_urlCountersPerEndpointType[element.endpoint_type] || requestUriCounter.create();
            _calc_urlCountersPerEndpointType[element.endpoint_type].incRequestCount( element.request_uri );

            //custom function
            onEachElement( element );

        });

        //create values after all elements processed

        //calculate relative values
        if ( !report.request_count_total ) throw "request_count_total required";
        ['request_count_per_endpoint', 'request_count_per_endpoint_type'].forEach( function( counterKey ) {

            Object.keys( report[counterKey] ).forEach( function( key ) {
                var count = report[counterKey][key];

                var relativeCounterKey = counterKey + "_relative";

                var value = count / report.request_count_total;

                report[relativeCounterKey][key] = Math.round(value * 10000) / 10000;


            });

        });


        //calculate advanced counters ans stats for types in list
        ['canary', 'baseline', 'default'].forEach( function( type ) {

            report.endpoint_types[type] = report.endpoint_types[type] || {};

            //top urls
            var urlCounter = _calc_urlCountersPerEndpointType[type]
            if ( urlCounter ) {
                report.endpoint_types[type].top_urls = urlCounter.getTopList( 7 );
            }

            //percentiles
            var elements = _calc_elementsPerEndpointType[type];
            if ( elements ) {
                [ 10, 50, 98 ].forEach( function( thPercentile ) {

                    var perc = percentile(
                        thPercentile,
                        elements,
                        function (element) { // function to extract value from object
                            return element.response_time_milliseconds;
                        }
                    );

                    report.endpoint_types[type].metrics = report.endpoint_types[type].metrics || {};
                    report.endpoint_types[type].metrics["response_time_milliseconds_percentile_"+thPercentile] = perc.response_time_milliseconds;

                });
            }

        });

        //compare workloads; to evaluate how equivalent they are
        var comparisons = [ ['canary', 'baseline'] ]; //only 1 comparison between canary and baseline for now
        comparisons.forEach( function( comp ) {
            var type1 = comp[0], type2 = comp[1];

            var comparisonLabel = type1+'_'+type2;
            var counter1 = _calc_urlCountersPerEndpointType[type1];
            var counter2 = _calc_urlCountersPerEndpointType[type2];

            if ( counter1 && counter2 ) {
                report.workload_comparison = report.workload_comparison || {};
                report.workload_comparison[comparisonLabel] = workloadComparisonReport.create( counter1, counter2 );
            }

        });

        return report

    }

}

var metricFormat = {
    response_time_milliseconds_percentile_x: function() {

    }
}

function convertToCsvExport(report) {

    var str =
        JSON.stringify( report.options ) + ";\n"
        + "Bucket;Metric;Baseline;Canary;Default;\n";

    if ( report.buckets ) {

        var bIndex = 0;
        report.buckets.forEach( function(b) {
            bIndex++;

            if (b.endpoint_types) {

                var endpointValuesPerMetric = {};

                ['baseline', 'canary', 'default' ].forEach( function(etp) {

                    if ( b.endpoint_types[etp]) {

                        var metrics = b.endpoint_types[etp].metrics;
                        if ( metrics ) {
                            Object.keys( metrics ).forEach( function(mKey) {
                                var mValue = metrics[mKey];
                                endpointValuesPerMetric[mKey] = endpointValuesPerMetric[mKey] || "";
                                endpointValuesPerMetric[mKey] = endpointValuesPerMetric[mKey] + mValue + ";";
                            });
                        }

                    }

                });

                Object.keys( endpointValuesPerMetric ).forEach(function( mKey ) {
                    str = str + "Bucket " + bIndex + ";" + formatMetricKey( mKey ) + ";" + endpointValuesPerMetric[mKey] + "\n";
                });

            }

        } );

    }

    return str;

    function formatMetricKey(mKey) {
        if ( mKey.startsWith("response_time_milliseconds_percentile_") ) {
            var formatted = mKey.replace("response_time_milliseconds_percentile_", "") + "th";
            return formatted;
        }

        return mKey;
    }

}

module.exports = {

    createReport: createReport

};
