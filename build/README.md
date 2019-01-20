# Build Container Images

To deploy YWC to Kubernetes, three container images must be available.
Since the container images are not in a central repository, you need to build the images to a repository that is accessible by your cluster.

Take a look into the subdirectories an the scripts in there.
There is an usable example for building with gcloud to the Google Container Registry (gcr)
and one for building with docker, which can be used to build to minikube.

The images that are required to build are:
- core
- loadbalancer (nginx)
- configloader
