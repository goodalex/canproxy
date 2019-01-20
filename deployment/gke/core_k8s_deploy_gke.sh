#!/bin/bash
set -e

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

kubectl apply -f $SCRIPTPATH/resources/core
