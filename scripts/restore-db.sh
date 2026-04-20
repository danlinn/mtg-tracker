#!/usr/bin/env bash
# Restore a DB backup produced by .github/workflows/db-backup.yml
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/restore-db.sh path/to/backup.sql.gz
#
# The dump file is a gzipped pg_dump in --clean --if-exists mode,
# so it will drop and recreate every table before loading data.
# MAKE SURE you're pointing at the right database.

set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: DATABASE_URL=... $0 <backup.sql.gz>"
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set"
  exit 1
fi

HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^/:]+).*|\1|')
echo "⚠️  About to restore $FILE into $HOST"
read -r -p "Are you absolutely sure? (type 'yes'): " answer
if [ "$answer" != "yes" ]; then
  echo "Aborted"
  exit 1
fi

gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "Restore complete"
