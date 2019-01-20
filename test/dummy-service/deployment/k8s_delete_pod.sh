#!/bin/bash
set -e

podname=$(kubectl -n webservice get pods --selector=app=webservice -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')

echo deleting pod: $podname
kubectl -n webservice delete pods $podname