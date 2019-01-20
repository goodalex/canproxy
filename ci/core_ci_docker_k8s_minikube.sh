#!/bin/bash
set -e

../build/docker/./core_docker_build.sh
../deployment/minikube/./core_k8s_deploy_minikube.sh
../deployment/./core_k8s_delete_first_pod.sh
