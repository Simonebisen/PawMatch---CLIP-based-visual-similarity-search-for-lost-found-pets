#!/bin/bash
# Runs once, automatically, on first init of a fresh postgres data volume
# (official postgres image convention: anything in /docker-entrypoint-initdb.d/).
#
# Creates a separate database for the test suite so pytest's schema
# create/drop never touches the dev database.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ${POSTGRES_DB}_test;
EOSQL
