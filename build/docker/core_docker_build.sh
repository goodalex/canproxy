#!/bin/bash
set -e

. project_env

docker build -t $CORE_IMAGE_TAG ../components/core/src
