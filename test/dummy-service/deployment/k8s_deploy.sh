#!/bin/bash
set -e

. project_env

cp -r k8s k8s_tmp

#echo $IMAGE_TAG
#echo ${IMAGE_TAG//\//\\/}

sed -i 's/\_\_IMAGE\_\_/'"${IMAGE_TAG//\//\\/}"'/g' k8s_tmp/deployment.yml

kubectl apply -f k8s_tmp

rm -r k8s_tmp