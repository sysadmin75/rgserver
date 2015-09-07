#!/bin/bash
set -e

echo "******CREATING DATABASE******"

export PGUSER=postgres
psql <<- EOSQL
    CREATE USER robot WITH PASSWORD 'allthebots';
EOSQL

echo "initializing tables"
psql -f /schema.sql

echo "******DATABASE CREATED******"
