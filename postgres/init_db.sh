#!/bin/bash
set -e

echo "Initializing database."

gosu postgres postgres --single <<- EOSQL
    CREATE USER robot WITH PASSWORD 'allthebots';
    CREATE DATABASE robotgame;
    GRANT ALL PRIVILEGES ON DATABASE robotgame TO robot;
EOSQL
