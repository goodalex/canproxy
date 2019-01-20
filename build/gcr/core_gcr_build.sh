#!/bin/bash

set -e

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

. $SCRIPTPATH/project_env


gcloud container builds submit --tag $CORE_IMAGE_TAG $SCRIPTPATH/../../components/core
