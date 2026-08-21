#!/bin/sh
set -e
SQL_FILE=$1
DUMP_FILE=$2
pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists -F p -f "/backups/$SQL_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-acl -F c -f "/backups/$DUMP_FILE"
ls -lh "/backups/$SQL_FILE" "/backups/$DUMP_FILE"
echo BACKUP_OK