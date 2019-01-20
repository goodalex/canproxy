#!/bin/bash
set -e

. project_env


docker build -t $BALANCER_NGINX_IMAGE_TAG ../components/balancer/loadbalancer
docker build -t $BALANCER_CONFIGLOADER_IMAGE_TAG ../components/balancer/configloader
./core_docker_build.sh
