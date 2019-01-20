# Canproxy - Tool for Canary Performance Assessment

Tool for Canary Performance Assessment of microservices in Kubernetes.

## 1 Architecture

### Overview

<img src="https://gitlab.com/alxdev/thesis-dev/raw/master/docs/images/img_ywc_architecture_complete.png" width="700">

### Components

* Core: Coordinates a canary assessment.
* Balancer: Distributes requests among default, baseline and canary instances.
Based on OpenResty distribution of nginx.
Enhancements implemented with lua module.
Contains a sidecar container that loads Kubernetes endpoints.



## 2 Deployment

Explains how to deploy YWC to a Kubernetes cluster.

Requires, that images for core, loadbalancer and configloader are
build and available in a container image repository accessible by the Kubernetes cluster.

Note: we assume the gcloud project name of "canary-proxy-inject", change according to your project name.

```
sudo docker build -t eu.gcr.io/canary-proxy-inject/ywc-core:0.5.0 ./components/core
sudo docker push eu.gcr.io/canary-proxy-inject/ywc-core:0.5.0
sudo docker build -t eu.gcr.io/canary-proxy-inject/ywc-loadbalancer:0.5.0 ./components/balancer/loadbalancer
sudo docker push eu.gcr.io/canary-proxy-inject/ywc-loadbalancer:0.5.0
sudo docker build -t eu.gcr.io/canary-proxy-inject/ywc-configloader:0.5.0 ./components/balancer/configloader
sudo docker push eu.gcr.io/canary-proxy-inject/ywc-configloader:0.5.0
sudo docker build -t eu.gcr.io/canary-proxy-inject/test-webservice:1.0.0 ./test/dummy-service/src
sudo docker push eu.gcr.io/canary-proxy-inject/test-webservice:1.0.0
```

### Prepare Cluster Nodes ###

With node labels the scheduling of YWC Pods can be controlled.

Mongodb has a selector.
Pick a node from your cluster that and give it the label ywc=mongodb.

```
kubectl get no
kubectl label nodes (nodename) ywc=mongodb
kubectl label nodes (nodename) app=core
```

Canary and baseline Pods will have a selector,
which makes that they are scheduled to nodes that have a specific label only.

Pick a node from your cluster that and give it the label ywc=sutnode.

```
kubectl get no
kubectl label nodes (nodename) ywc=sutnode
```

Balancer Pods will have a selector,
which makes that they are scheduled to nodes that have a specific label only.

Pick a node from your cluster that and give it the label ywc=balancer.
```
kubectl label nodes (nodename) ywc=balancer
```

Finally set a label for the benchmark and webservice:
```
kubectl label nodes (nodename) app=benchmark
kubectl label nodes (nodename) app=webservice
```

### Setup MongoDB in K8s ###
Setup namespace, create secret and create deployment.
```
kubectl apply -f deployment/gke/resources/mongodb/ns.yml
./deployment/gke/resources/mongodb/generate.sh
kubectl apply -f deployment/gke/resources/mongodb/mongodb.yml
```
Wait ~ 2 minutes until mongodb pod started successfully.
Check with:
```
kubectl -n ywc get all
```
When it is ready, configure MongoDB authentication by executing:
```
./deployment/gke/resources/mongodb/configure_repset_auth.sh pass
```
(prototype phase: core is configured to use password *pass* in core/deployment.yml)

*MongoDB is based on the following example:
https://github.com/pkdone/minikube-mongodb-demo*

### Deploy Core to K8s ###
The core uses a RBAC (role based access control), because for its functionality
it reads resources that exists in the cluster and creates resources in the cluster.

#### Google Kubernetes Engine ####
To give the core the permission its needs, your account itself needs extended RBAC settings.
Create a cluster-admin binding for your account.
(found here: https://github.com/coreos/prometheus-operator/issues/357)
```
kubectl create clusterrolebinding ywc-admin-cluster-admin-binding --clusterrole=cluster-admin --user=your.google.cloud.email@example.org
```

Verify, that image names are coorect in gke/resources/deployment.yml.

Apply core resources files to Kubernetes:
```
kubectl apply -f deployment/gke/resources/core
```

#### Minikube ####

Verify, that image names are coorect in minikube/resources/deployment.yml.

Apply core resources files to Kubernetes:
```
k apply -f minikube/resources
```


## 3 Start Using

Usage requires, that images are build, published to a repository
accessible by the target Kubernetes cluster
and the deployment is done.

If those requirements are not met, take a look at the directores *build* and *deployment*.

YWC is running as Pod, managed by a Deployment and accessible via a Service.
It is running in the namespace ywc.

Get access to the API, e.g. by kubectl port forwarding:

```
kubectl port-forward --namespace ywc $(kubectl get pod --namespace ywc --selector="app=core" --output jsonpath='{.items[0].metadata.name}') 8080:80
```
(keep running in shell or move to background)
Or connect to the cluster network, so you can access the core service
at core.ywc:80.

### Create a run ###
Example for a run for a service called *productsearch* in the namespace *products*,
with a deployment called *productsearch*.
```
curl -X POST
  http://core.ywc:80/api/v1/runs
  -H 'Content-Type: application/json'
  -d '{
    "namespace": {
        "name": "products"
    },
    "service": {
		"name": "productsearch"
	},
	"deployment": {
		"name": "productsearch"
	}
}'
```

### Access Core Development UI ###
Basic functions are provided via a development core UI.
When connected to the cluster, the UI is available at http://core.ywc:80/.
