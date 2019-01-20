const config = require('./../config.js');
const prom = require('./../system/prom.js');  

var flags_map = {
    main: {}
};

function get(id) {
    
    return new Promise(function(resolve, reject) {

        if ( id == 'main') {

            resolve({
            
                config: {
                   runtime: config.runtime()
                },
                flags: flags_map[id]
    
            });
    
        } else {
            reject({notFoundError: 'not found'})
        }

    });


}

function setStatusValue(key, value) {

    if (value instanceof Date) {
        flags_map.main[key] = value.toISOString();
    } else {
        flags_map.main[key] = value;
    }

}

function setFunctionSuccess(key, value) {

    setStatusValue(key+"_success", value);

    prom.set_function_success( key, value == true ? 1 : 0);

    if (value == true) {
        flags_map.main[key+"_success_last"] = new Date().toISOString();
    }

}

module.exports = {

    get: get,
    setStatusValue: setStatusValue,
    setFunctionSuccess: setFunctionSuccess
    
};