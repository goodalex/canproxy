#!/bin/bash
##
# Script to connect to the first Mongod instance running in a container of the
# Kubernetes StatefulSet, via the Mongo Shell, to initalise a MongoDB Replica
# Set and create a MongoDB admin user.
#
# IMPORTANT: Only run this once 3 StatefulSet mongod pods are show with status
# running (to see pod status run: $ kubectl get all)
##

# Check for password argument
if [[ $# -eq 0 ]] ; then
    echo 'You must provide one argument for the password of the "madmin" user to be created'
    echo '  Usage:  configure_repset_auth.sh MyPa55wd123'
    echo
    exit 1
fi

namespace=ywc

# Initiate replica set configuration
echo "Configuring the MongoDB Replica Set"
kubectl -n $namespace exec mongodb-0 -c mongod-container -- mongo --eval 'rs.initiate({_id: "MainRepSet", version: 1, members: [ {_id: 0, host: "mongodb-0.mongodb.'$namespace'.svc.cluster.local:27017"} ]});'

# Wait a bit until the replica set should have a primary ready
echo "Waiting for the Replica Set to initialise..."
sleep 30
kubectl -n $namespace exec mongodb-0 -c mongod-container -- mongo --eval 'rs.status();'

# Create the admin user (this will automatically disable the localhost exception)
echo "Creating user: 'main_admin'"
kubectl -n $namespace exec mongodb-0 -c mongod-container -- mongo --eval 'db.getSiblingDB("admin").createUser({user:"madmin",pwd:"'"${1}"'",roles:[{role:"root",db:"admin"}]});'
echo