#!/bin/bash
set -e

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

. $SCRIPTPATH/project_env

gcloud container builds submit --tag $CORE_IMAGE_TAG $SCRIPTPATH/../../components/core
gcloud container builds submit --tag $BALANCER_NGINX_IMAGE_TAG $SCRIPTPATH/../../components/balancer/loadbalancer
gcloud container builds submit --tag $BALANCER_CONFIGLOADER_IMAGE_TAG $SCRIPTPATH/../../components/balancer/configloader