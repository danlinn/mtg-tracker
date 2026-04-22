#!/usr/bin/env bash
# Push the current prisma/schema.prisma to the PRODUCTION database,
# using the unpooled Neon endpoint (avoids pooler schema caching).
#
# Usage:
#   ./scripts/push-prod-schema.sh
#
# Prerequisites: you must already have pulled Vercel env:
#   npx vercel env pull .env.production.local --environment=production

set -euo pipefail

if [ ! -f .env.production.local ]; then
  echo "Missing .env.production.local"
  echo "Run: npx vercel env pull .env.production.local --environment=production"
  exit 1
fi

# Extract the unpooled URL, stripping any trailing newlines or quotes
UNPOOLED=$(grep '^NEON_DATABASE_URL_UNPOOLED=' .env.production.local \
  | sed 's/^NEON_DATABASE_URL_UNPOOLED=//; s/^"//; s/"$//; s/\\n$//' \
  | tr -d '\r\n')

if [ -z "$UNPOOLED" ]; then
  echo "NEON_DATABASE_URL_UNPOOLED not found in .env.production.local"
  exit 1
fi

MASKED=$(echo "$UNPOOLED" | sed 's/:[^:@]*@/:***@/')
echo "Pushing schema to:"
echo "  $MASKED"
echo
read -r -p "Type 'yes' to continue: " answer
if [ "$answer" != "yes" ]; then
  echo "Aborted"
  exit 1
fi

# Temporarily backup .env.local and write a clean one with only the
# unpooled URL so prisma.config.ts picks it up correctly.
cp .env.local .env.local.bak 2>/dev/null || true
{
  echo "DATABASE_URL=\"$UNPOOLED\""
  echo "POSTGRES_URL=\"$UNPOOLED\""
} > .env.local

echo
echo "Running prisma db push..."
npx prisma db push --accept-data-loss

# Restore original .env.local
if [ -f .env.local.bak ]; then
  mv .env.local.bak .env.local
else
  rm -f .env.local
fi

echo
echo "Done. Verify at https://mtg.danlinn.com/api/admin/db-debug?key=debug-mtg-2026"
