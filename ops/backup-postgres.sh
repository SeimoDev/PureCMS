#!/usr/bin/env sh
set -eu

OUTPUT_DIR="${OUTPUT_DIR:-backups}"
SERVICE="${SERVICE:-db}"
DATABASE="${POSTGRES_DB:-cms}"
USER="${POSTGRES_USER:-cms}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_PATH="$OUTPUT_DIR/postgres-$TIMESTAMP.sql"

mkdir -p "$OUTPUT_DIR"
echo "Creating PostgreSQL backup: $BACKUP_PATH"
docker compose exec -T "$SERVICE" pg_dump -U "$USER" -d "$DATABASE" --format=plain --no-owner --no-acl > "$BACKUP_PATH"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_PATH" | awk '{print $1}' > "$BACKUP_PATH.sha256"
fi

echo "Backup complete: $BACKUP_PATH"
