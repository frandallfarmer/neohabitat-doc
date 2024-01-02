#!/usr/bin/env bash
SCRIPTPATH="$( cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
export MAMELINK="${SCRIPTPATH}/mameplugins/mamelink"
./down < reno.out
