#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# Starts PostgreSQL (the container may have restarted), makes sure the local dev/test
# databases exist, installs dependencies and applies migrations. Idempotent.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Local-only credentials for the throw-away cloud container database (not secrets).
DB_USER="blf"
DB_PASSWORD="blf_local_dev"
DEV_DB="blue_legacy"
TEST_DB="blue_legacy_test"

# 1. PostgreSQL
if ! pg_isready -q 2>/dev/null; then
  service postgresql start >/dev/null 2>&1 || pg_ctlcluster 16 main start
fi
for _ in $(seq 1 30); do
  pg_isready -q && break
  sleep 1
done
pg_isready -q || { echo "PostgreSQL did not start" >&2; exit 1; }

psql_admin() { su postgres -c "psql -v ON_ERROR_STOP=1 -tAc \"$1\""; }
if [ "$(psql_admin "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")" != "1" ]; then
  psql_admin "CREATE ROLE ${DB_USER} LOGIN CREATEDB PASSWORD '${DB_PASSWORD}'"
fi
for db in "$DEV_DB" "$TEST_DB"; do
  if [ "$(psql_admin "SELECT 1 FROM pg_database WHERE datname='${db}'")" != "1" ]; then
    su postgres -c "createdb -O ${DB_USER} ${db}"
  fi
done

# 2. Local .env (gitignored) for a fresh clone
if [ ! -f .env ]; then
  cat > .env <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DEV_DB}"
TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${TEST_DB}"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
RATE_LIMIT_SALT="local-dev-salt-change-me"
ENV
fi

# 3. Dependencies (also generates the Prisma client via postinstall)
npm install --no-audit --no-fund

# 4. Migrations (non-destructive) and idempotent DEMO seed for the dev database
npx prisma migrate deploy
npx prisma db seed
