#!/usr/bin/env bash
# Recreates the local "vairo" database: Supabase shim → migrations → seed.
set -euo pipefail
cd "$(dirname "$0")/../.."
run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q -d vairo -f '$1'" ; }

su postgres -c "psql -q -c 'drop database if exists vairo with (force)' -c 'create database vairo'"
for f in tests/stack/shim.sql supabase/migrations/*.sql supabase/seed.sql; do
  cp "$f" /tmp/vairo-sql.sql && chmod 644 /tmp/vairo-sql.sql
  echo "→ $f"
  run /tmp/vairo-sql.sql
done
su postgres -c "psql -q -d vairo -c \"alter role authenticator password 'authenticator'\""
echo "database ready"
