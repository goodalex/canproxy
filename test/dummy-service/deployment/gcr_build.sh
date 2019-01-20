#!/bin/bash
set -e

. project_env

gcloud container builds submit --tag $IMAGE_TAG ../src