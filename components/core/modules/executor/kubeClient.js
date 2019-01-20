/*

Wraps calls to Kubernetes API client library
and KUbernetes CLI.

It is using Kubernetes CLI (kubectl) to have better control because 
node API client library does not behave as expected in some cases.

kubectl is installed in Dockerfile.

*/

const prom = require('./../system/prom.js');  
const k8s = require('@kubernetes/client-node');
var k8sApi = k8s.Config.defaultClient();

const exec = require('child_process').exec;
const fs    = require('fs');
const util = require('util');

function onResponse(res) {

    if ( res.statusCode != 201 && res.statusCode != 200 ) {
        console.info( 'k8s client onResponse', JSON.stringify(res) );
    }

}


function createService( namespaceName, config ) {

    return k8sApi.createNamespacedService( namespaceName, config, true)
        .then((result) => {

            var success = 0;

            onResponse(result.response);

            if ( result.response.statusCode == 201 ) {
                success = 1;
            }

        });
}

function replaceService( namespaceName, serviceName, config ) {

    return new Promise(function(resolve, reject) {
    
        k8sApi.replaceNamespacedService( serviceName, namespaceName, config, true).then((result) => {

            onResponse(result.response);

            if ( result.response.statusCode == 201 ) {
                resolve(result);
            } else {
                reject( result );
            }
            
        }).catch((err) => {
            reject(err);
        });

    });

}

function patchService( namespaceName, serviceName, config ) {

    return new Promise(function(resolve, reject) {
    
        k8sApi.patchNamespacedService( serviceName, namespaceName, config, true).then((result) => {

            onResponse(result.response);

            if ( result.response.statusCode == 201 ) {
                resolve(result);
            } else {
                reject( result );
            }
            
        }).catch((err) => {
            reject(err);
        });

    });

}

function getService(namespaceName, serviceName) {

    return new Promise(function(resolve, reject) {

        k8sApi.readNamespacedService( serviceName, namespaceName, true, false, true)
        .then((result) => {
            
            var success = 0;

            onResponse(result.response);

            var service = eval(result.body);
            
            resolve( service );

        }).catch((err) => {

            reject( err );

        });


    });

}

function kubectl(command, logErrors) {

    if (logErrors == null) logErrors = true;

    return new Promise(function(resolve, reject) {

        var cmdComplete = "kubectl " + command;

        console.log("executing: " + cmdComplete);

        var k = exec( cmdComplete , function(err, stdout, stderr) {
            
            if (err) {
                if (logErrors) console.error("kubectl err", err );
                reject(err); 
                
            } else {
                var preview = stdout.length > 40 ? stdout.substring(0, 35) : stdout;

                console.log("kubectl executed, stdout preview: " + preview );
                resolve(stdout);
            }

        });
        
        
        k.on('exit', function (code) { // not sure if required when there is error handling above
            if (code != 0) {
                if (logErrors == null)  console.error("kubectl code", code );
                //reject(code);
            }
        });
        

    });

}

function getFilePathForObject(object) {

    if (object == null) throw "object cannot be null";

    const fs_writeFile = util.promisify(fs.writeFile);

    var filename = new Date().getTime();

    var path = "/tmp/" + filename;

    console.log( "attempt to write file (path: " + path + ")" );

    return fs_writeFile(path, JSON.stringify( object )).then(function(err) {
        if(err) {
            console.error("error writing file (path: " + path + ")", err);
            throw err;
        }
    
        console.log("The file was saved: " + path);
    
        return path;
    }); 

}

function kubectlApply(namespace) {
    return function(path) {
        var namespacePart = namespace ?  "-n " + namespace + " " : "";
        return kubectl( namespacePart + "apply -f " + path );
    };
}

function kubectlReplace(namespace) {
    return function(path) {
        var namespacePart = namespace ?  "-n " + namespace + " " : "";
        return kubectl( namespacePart + "replace -f " + path );
    };
}

function kubectlApplyByObject(object, namespace) {
    return getFilePathForObject( object ).then( kubectlApply(namespace) );
}

function kubectlReplacebyObject(object, namespace) {
    return getFilePathForObject( object ).then( kubectlReplace(namespace) );
}

function getDeploymentJsonStr(namespace, deployment) {
    if (!namespace) throw "namespace required";
    if (!deployment) throw "deployment required";

    return kubectl("-n "+namespace+" get deployments/"+deployment+" -o json --export");
}

function kubectlDelete(namespace,kind,name) {
    if (!namespace) throw "namespace required";
    if (!kind) throw "kind required";
    if (!name) throw "name required";

    return kubectl("-n " + namespace + " delete " + kind + " " + name);
}

function deleteIfExists(namespace,kind,name) {

    return exists( namespace, kind, name ).then( function(exists) {
                           
        if ( exists ) {
            //delete
            return kubectlDelete( namespace, kind, name ).then(function(result) {
                console.log( result );
                console.log( kind + " " + name + " in " + namespace + " deleted" );
                return true;
            });
        } else {
            //do nothing
            console.log( kind + " " + name + " in " + namespace + " not found") ;
            return false;
        }

    });

}

function exists(namespace,kind,name) {
    if (!namespace) throw "namespace required";
    if (!kind) throw "kind required";
    if (!name) throw "name required";

    return kubectl("-n " + namespace + " get " + kind + " " + name, false).then(function(result) {

        //exists
        console.log(namespace, kind, name, "exists");
        return true;

    }).catch(function(err) {

        //console.log("thisiserror", err);

        //does not exist or command error
        if (err && err.message && err.message.includes( "NotFound" ) ) {
            //does not exist, return false
            console.log(namespace, kind, name, "does not exist");
            return false;
        } else {
            //real error during command, propagate error
            console.error("error during command, response not recognized");
            throw err;
        }

    });

}

function nodeLabelAdd(node, key, value) {
    if (!node) throw "nodeLabelAdd - node required";
    if (!node) throw "nodeLabelAdd - key required";
    if (!node) throw "nodeLabelAdd - value required";
    return kubeClient.kubectl( "label nodes "+node+" "+key+"="+value+"" );
}


module.exports = {

    getService: getService,
    createService: createService,
    replaceService: replaceService,
    patchService: patchService,
    kubectl: kubectl,
    kubectlApplyByObject: kubectlApplyByObject,
    kubectlReplacebyObject: kubectlReplacebyObject,
    getDeploymentJsonStr: getDeploymentJsonStr,
    kubectlDelete: kubectlDelete,
    exists: exists,
    deleteIfExists: deleteIfExists,
    nodeLabelAdd: nodeLabelAdd
    
};