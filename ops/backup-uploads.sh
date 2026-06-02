#!/usr/bin/env sh
set -eu

OUTPUT_DIR="${OUTPUT_DIR:-backups}"
SERVICE="${SERVICE:-api}"
UPLOAD_DIR="/app/uploads"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_PATH="$OUTPUT_DIR/uploads-$TIMESTAMP.tar.gz"

mkdir -p "$OUTPUT_DIR"
echo "Creating upload backup: $BACKUP_PATH"
docker compose exec -T "$SERVICE" tar -C "$UPLOAD_DIR" -czf - . > "$BACKUP_PATH"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_PATH" | awk '{print $1}' > "$BACKUP_PATH.sha256"
fi

echo "Backup complete: $BACKUP_PATH"
