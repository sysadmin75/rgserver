#!/bin/bash
set -e

echo "******CREATING DATABASE******"

gosu postgres postgres --single <<- EOSQL
    CREATE USER robot WITH PASSWORD 'allthebots';
EOSQL

echo "starting postgres"
gosu postgres pg_ctl -w start

echo "initializing tables"
gosu postgres psql -f /schema.sql

echo "stopping postgres"
gosu postgres pg_ctl stop

echo "stopped postgres"

echo "******DATABASE CREATED******"
