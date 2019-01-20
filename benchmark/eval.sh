#!/bin/bash
if [ "$#" -ne 1 ]; then
    echo "Need one parameter: identifier of the benchmarker pod in the Kubernetes cluster."
    exit 1
fi
PODNAME=$1
kubectl -n ywc cp ${PODNAME}:/results/ ./results/