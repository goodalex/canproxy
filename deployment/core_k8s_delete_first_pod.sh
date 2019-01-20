#!/bin/bash
set -e
echo "delete first pod"
podname=$(kubectl -n ywc get pods --selector=app=core -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')

echo deleting pod: $podname
kubectl -n ywc delete pods $podname