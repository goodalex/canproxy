#!/bin/bash
set -e

../build/gcr/./all_gcr_build.sh
../deployment/gke/./core_k8s_deploy_gke.sh
../deployment/./core_k8s_delete_first_pod.sh # force reload in case image name stays the same
