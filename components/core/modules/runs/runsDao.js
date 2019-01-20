/*

Basic database operations for a run - insert, get etc.

*/

const mongodb = require('./../client/mongodb.js');

const MONGODB_COLLECTION = "runs";


function getMongoDbCollection() {
    return mongodb.getCollection( MONGODB_COLLECTION );
}

function get(id) {

    return getMongoDbCollection().then( function(col) {

        return new Promise(function(resolve, reject) {

            if ( id == "last" ) {
                col.find({}).sort({ $natural: -1 }).limit(1).toArray(function(err, result) {
                    if ( err ) throw err;
    
                    if ( result == null ) {
                        reject( { notFoundError: "run not found" } );
                    } else {
                        resolve( result[0] );
                    }
                });
            } else {

                col.findOne({ id: id }, function(err, result) {
                    if ( err ) throw err;
    
                    if ( result == null ) {
                        reject( { notFoundError: "run not found" } );
                    } else {
                        resolve( result );
                    }
                });

            }
            
    
        });
        
    });
    
}

function create(run) {

    return getMongoDbCollection().then( function(col) {

        return new Promise(function(resolve, reject) {
    
            col.insertOne( run, function(err, result) {
            
                if(err) {
                    console.log('Error occurred while inserting');
                    reject({ mongodbError: err });
                } else {
                    console.log('inserted record', result.ops[0]);
                    
                    var createdRun = result.ops[0];
    
                    resolve( createdRun );
                }
    
            });
    
        });
    
    });

}

function update(item) {

    if (item == null) throw "item cannot be null";

    //console.log('update item ' +  JSON.stringify(item) );
    //console.log('update item ' +  item.id );

    return getMongoDbCollection().then( function(col) {

        return new Promise(function(resolve, reject) {

            col.update({id: item.id}, { $set: item }, function(err, result) {
                if (err) throw {error: err};

                console.log('updated item ' +  item.id );
                get( item.id )
                    .then(function(updatedItem) {
                        //console.log("updatedItem", updatedItem);
                        resolve( updatedItem );
                    }).catch(function(err) {
                        reject(err);
                    });
    
             });

        });

    });

}

function deleteAll() {
    return getMongoDbCollection().then( function(col) {
        return new Promise(function(resolve, reject) {
    
            col.deleteMany( {}, function(err, result) {
                if (err) throw err;
                resolve({});
            });
    
        });
    } );
}

function getAll() {

    return getMongoDbCollection().then( function (col) {

            return new Promise((resolve, reject) => {

                col.find({}).toArray(function(err, items) {
                    resolve( items );
                });

            });

        });

}


module.exports = {
    get: get,
    getAll: getAll,
    create: create,
    update: update,
    deleteAll: deleteAll
}