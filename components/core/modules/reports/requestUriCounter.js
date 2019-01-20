function toArray(obj) {
  var arr = [];
  Object.keys( obj ).forEach(function(key) {
    arr.push( { url: key, count: obj[key] } );
  });
  return arr;
}

function getArraySnapshot(data) {
  var snapshot = JSON.parse(JSON.stringify(data));
  return toArray( snapshot );
}

function create() {

  var data = {};
  var request_count_total = 0;

  return {

    getArraySnapshot: function() {
      return getArraySnapshot(data);
    },
    getByUrl: function(url) {
      return data[url];
    },
    incRequestCount: function(url) {
      data[url] = data[url] || 0;
      data[url]++;
      request_count_total++;
    },
    get: function() {
      return data;
    },
    getUniqueRequestUrlCount: function() {
      return Object.keys( data ).length;
    },
    getTopList: function(limit) {

      var dataSnapshot = JSON.parse(JSON.stringify(data));

      var list = toArray( dataSnapshot );
      list.sort(function(a, b){
        return b.count - a.count;
      });

      list = list.slice(0, Math.min( limit, list.length) );

      //console.log( 'list', list );

      return list;
    },
    getRequestCountTotal: function() {
      return request_count_total;
    }

  }

}

module.exports = {
  create: create
};
