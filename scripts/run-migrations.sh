#!/usr/bin/env bash
# ── run-migrations.sh ─────────────────────────────────────────────────────────
# Runs all Supabase migrations against a given database URL in order.
#
# Usage:
#   DB_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
#   ./scripts/run-migrations.sh "$DB_URL"
#
# The DB_URL is found in: Supabase Dashboard → Project Settings → Database → URI
# (Use the "Session mode" URI on port 5432, not the pooler.)
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "❌  No database URL provided."
  echo "    Usage: ./scripts/run-migrations.sh \"postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres\""
  exit 1
fi

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"

echo "🔗  Target: ${DB_URL%%@*}@…"
echo "📂  Migrations: $MIGRATIONS_DIR"
echo ""

for file in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$file")"
  echo "▶   $name"
  psql "$DB_URL" -f "$file" -v ON_ERROR_STOP=1 -q
  echo "✅  $name"
done

echo ""
echo "🎉  All migrations applied."
