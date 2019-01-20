#!/bin/bash
set -e

./gcr_build.sh
./k8s_deploy.sh
./k8s_delete_pod.sh #force new version - because in the process of development I redeploy with same version number