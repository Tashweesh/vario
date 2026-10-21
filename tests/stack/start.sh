#!/usr/bin/env bash
# Local test stack: Postgres (already running) + PostgREST + gateway on :54321.
# Prereqs: a PostgREST binary on PATH or in $POSTGREST_BIN, and `tests/stack/reset-db.sh` applied.
set -euo pipefail
cd "$(dirname "$0")"
BIN="${POSTGREST_BIN:-postgrest}"
export PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:5432/vairo"
export PGRST_DB_SCHEMAS="public"
export PGRST_DB_ANON_ROLE="anon"
export PGRST_JWT_SECRET="${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
export PGRST_SERVER_PORT=3001
export PGRST_DB_POOL=10
"$BIN" > /tmp/claude-0/postgrest.log 2>&1 &
echo $! > /tmp/claude-0/postgrest.pid
node gateway.mjs > /tmp/claude-0/gateway.log 2>&1 &
echo $! > /tmp/claude-0/gateway.pid
sleep 1.5
node -e "import('./jwt.mjs').then(m => console.log('VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_ANON_KEY=' + m.ANON_KEY))"
