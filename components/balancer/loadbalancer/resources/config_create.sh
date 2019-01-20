#!/bin/bash

if [ -z "$YWC_HOME" ]; then
    echo env YWC_HOME must be set
    exit 1
fi
if [ -z "$YWC_RUNTIME" ]; then
    echo env YWC_RUNTIME must be set
    exit 1
fi
if [ -z "$YWC_PROV_DIR" ]; then
    echo env YWC_PROV_DIR must be set
    exit 1
fi


# absolute script path
SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

# prepare vars
export YWC_RESOURCES_LUA=$YWC_HOME/lbmodules

if [ -z "$YWC_RESOURCES_LUA" ]; then
    echo env YWC_RESOURCES_LUA must be set
    exit 1
fi
if [ -z "$START_CMD" ]; then
    echo env START_CMD must be set
    exit 1
fi

# set vars to templates
CONF_TEMPLATES=$YWC_HOME/conf-template
envsubst '\$YWC_RESOURCES_LUA \$START_CMD' < $CONF_TEMPLATES/loadbalancer.template.conf > $YWC_RUNTIME/loadbalancer.conf
envsubst '\$YWC_RESOURCES_LUA \$START_CMD' < $CONF_TEMPLATES/nginx.conf > $YWC_RUNTIME/nginx.conf
