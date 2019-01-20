# Dummy Service
A dummy service implemented in node.js.
Has a page on root path '/' where it shows some meta information.

## Build and push image
```
sudo docker build -t eu.gcr.io/canary-proxy-inject/test-webservice:1.0.0 .
sudo docker push eu.gcr.io/canary-proxy-inject/test-webservice:1.0.0
```

## Prepare cluster

Pick a node from your cluster and give it the label as below.
```
kubectl get no
kubectl label nodes (nodename) app=webservice
```

## Start sample app
```
kubectl apply -f test/dummy-service/deployment/k8s
```

## Connect to Core-Service
Get access to the API, e.g. by kubectl port forwarding:

```
kubectl port-forward --namespace ywc $(kubectl get pod --namespace ywc --selector="app=core" --output jsonpath='{.items[0].metadata.name}') 8080:80
```
(keep running in shell or move to background)

## Add sample run
```
curl -X POST http://localhost:8080/api/v1/runs -H 'Content-Type: application/json' -d @test/dummy-service/body.json
```

## Canary Mode

Start with command line arg --mode=canary

##### Parameters

Possible paramters for requests:
mode_canary_response_delay=(milliseconds)


## Deprecated Functions
- exports HTTP requests statistics in prometheus format at /metrics