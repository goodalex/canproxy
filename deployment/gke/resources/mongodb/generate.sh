#!/bin/sh

##
# Script to deploy a Kubernetes project with a StatefulSet running a MongoDB Replica Set, to a local Minikube environment.
##

# Create keyfile for the MongoD cluster as a Kubernetes shared secret
TMPFILE=$(mktemp)
DIR="$( cd "$( dirname "$(readlink -f "$0")" )" >/dev/null && pwd )"
/usr/bin/openssl rand -base64 741 > $TMPFILE
kubectl -n ywc create secret generic shared-bootstrap-data --from-file=internal-auth-mongodb-keyfile=$TMPFILE
rm $TMPFILE