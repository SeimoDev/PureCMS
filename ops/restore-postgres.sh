#!/usr/bin/env sh
set -eu

BACKUP_PATH="${1:-}"
CONFIRM_TEXT="${2:-}"
SERVICE="${SERVICE:-db}"
DATABASE="${POSTGRES_DB:-cms}"
USER="${POSTGRES_USER:-cms}"

if [ -z "$BACKUP_PATH" ]; then
  echo "Usage: ops/restore-postgres.sh <backup.sql> RESTORE" >&2
  exit 2
fi

if [ "$CONFIRM_TEXT" != "RESTORE" ]; then
  echo "Refusing to restore. Pass RESTORE as the second argument to confirm this destructive database operation." >&2
  exit 2
fi

echo "Restoring PostgreSQL database '$DATABASE' from $BACKUP_PATH"
echo "This will drop and recreate the public schema inside the running Docker database service."
docker compose exec -T "$SERVICE" psql -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
cat "$BACKUP_PATH" | docker compose exec -T "$SERVICE" psql -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=1
echo "Restore complete."
