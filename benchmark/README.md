# Benchmarking the YWC tool

## Create Docker image for vegeta and upload to repo
```
sudo docker build -t eu.gcr.io/canary-proxy-inject/vegeta:12.2.0 .
```

## Create deployment for workload generator
```
kubectl apply -f benchmark/deployment.yml
```
## Connect to container
```
kubectl -n ywc exec -it PODNAME --container benchmark -- /bin/sh
```
Kubernetes GKE Version 1.10.9gke5