const config = require('./../config.js');
const mongoClient = require('mongodb').MongoClient;
const statusController = require('./../status/statusController.js');
const assert = require('assert');

var db = null;

function getUrl() {
    return config.runtime().mongodb.url;
}

function getDbName() {
    return config.runtime().mongodb.dbName;
}

function connect() {
    return mongoClient.connect( getUrl(), { useNewUrlParser: true } );
}

async function init() {
    
    console.log('mongo connect url', getUrl() );

    let client;

    try {

        client = await connect();

        const db = client.db( getDbName() );

        // Get the collection
        const col = db.collection('test');

        // Insert a single document
        const r = await col.insertMany([{a:1}, {a:1}, {a:1}]);
        assert.equal(3, r.insertedCount);

        client.close();
        statusController.setFunctionSuccess( "mongodb_connection_test", true );
    } catch (err) {
        console.log(err.stack);
        statusController.setFunctionSuccess( "mongodb_connection_test", false );
    }

}

function getCollection(collectionName) {
    return connect().then( function(client) {

        const db = client.db( getDbName() );
        const col = db.collection( collectionName );

        return col;
    } );
}

/**
 *
 *
    connect()
        .then( function(err, db) {
            if (err) throw err;
            console.log(result);
            statusController.setFunctionSuccess( "mongodb_connection_test", true );
        })
        .catch( function() {

        });;
 *
 */

module.exports = {

    init: init,
    connect: connect,
    getCollection: getCollection

};
