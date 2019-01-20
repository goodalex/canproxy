const request   = require('request');
const config    = require('./config.js');
const prom      = require('./prom.js');  

function sendReloadRequest() {

    var url = config.runtime().nginx.location + "/reload";

    request.post({
        url:     url
    }, function(error, response, body){
      
        var success = 0;

        if (error) { 
            prom.set_function_success('nginx_send_reload_request', success);
            return console.log(error); 
        }

        if ( response ) {
            console.info( "sendReloadRequest ", response && response.statusCode );


            if (response && response.statusCode == 200 ) {
                success = 1;
            } 

        }

        prom.set_function_success('nginx_send_reload_request', success);
        
    });

}

module.exports = {

    sendReloadRequest: sendReloadRequest
  
};