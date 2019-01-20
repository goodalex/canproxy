#!/bin/bash
set -e

. project_env

docker build -t $IMAGE_TAG ../src