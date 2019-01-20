/**
 *
 * Compares two workloads.
 *
 * Workloads must be provided as requestUriCounters.
 *
 * @param {*} counter1
 * @param {*} counter2
 */

function create(counter1, counter2) {

  if ( !counter1 ) throw "counter1 required for comparison";
  if ( !counter2 ) throw "counter2 required for comparison";

    var report = {
      request_count_total: 0,
      request_uri_count_total: 0,

      request_uri_exists_in_both_count: 0,
      request_uri_EqualAndCountEqual: { urls: 0, totalRequestCount: 0},
      request_uri_EqualAndCountDifferent: { urls: 0, requestCountShared:0, requestCountDelta1: 0, requestCountDelta2: 0},
      request_uri_In1AndNotIn2: { urls: 0, totalRequestCount: 0},
      request_uri_In2AndNotIn1: { urls: 0, totalRequestCount: 0}
    };

    counter1.getArraySnapshot().forEach(function(item){

        report.request_count_total+=item.count;

        report.request_uri_count_total++;

        var equivalent = counter2.getByUrl(item.url);
        if (equivalent != null) {

            report.request_uri_exists_in_both_count++;

            if (item.count == equivalent) {
              report.request_uri_EqualAndCountEqual.urls++;
              report.request_uri_EqualAndCountEqual.totalRequestCount+=item.count;
            } else {
              report.request_uri_EqualAndCountDifferent.urls++;

              var smaller, bigger;
              if ( item.count > equivalent ) {
                smaller = equivalent;
                bigger = item.count;

                var delta = bigger-smaller;
                report.request_uri_EqualAndCountDifferent.requestCountDelta1+=delta;
                report.request_uri_EqualAndCountDifferent.requestCountShared+=smaller;
              } else {
                bigger = equivalent;
                smaller = item.count;

                var delta = bigger-smaller;
                report.request_uri_EqualAndCountDifferent.requestCountDelta2+=delta;
                report.request_uri_EqualAndCountDifferent.requestCountShared+=smaller;
              }

            }
        } else {
          report.request_uri_In1AndNotIn2.urls++;
          report.request_uri_In1AndNotIn2.totalRequestCount+=item.count;
        }

    });

    counter2.getArraySnapshot().forEach(function(item){

        report.request_count_total+=item.count;

        var equivalent = counter1.getByUrl(item.url);
        if (equivalent == null) {
          report.request_uri_In2AndNotIn1.urls++;
          report.request_uri_In2AndNotIn1.totalRequestCount+=item.count;
          report.request_uri_count_total++;
        }

    });

    report.uniquenessFactor1 =
        (    report.request_uri_EqualAndCountDifferent.requestCountDelta1
           + report.request_uri_In1AndNotIn2.totalRequestCount
         ) / counter1.getRequestCountTotal();

    report.uniquenessFactor2 =
        (    report.request_uri_EqualAndCountDifferent.requestCountDelta2
           + report.request_uri_In2AndNotIn1.totalRequestCount
         ) / counter2.getRequestCountTotal();

    report.controlRequestCount=
    report.request_uri_EqualAndCountEqual.totalRequestCount*2
  + report.request_uri_EqualAndCountDifferent.requestCountShared*2
  + report.request_uri_EqualAndCountDifferent.requestCountDelta1
  + report.request_uri_EqualAndCountDifferent.requestCountDelta2
  + report.request_uri_In2AndNotIn1.totalRequestCount
  + report.request_uri_In1AndNotIn2.totalRequestCount
  ;

    return report;

  }

module.exports = {
    create: create
}
