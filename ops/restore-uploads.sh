#!/usr/bin/env sh
set -eu

BACKUP_PATH="${1:-}"
CONFIRM="${2:-}"
SERVICE="${SERVICE:-api}"
UPLOAD_DIR="/app/uploads"

if [ -z "$BACKUP_PATH" ] || [ "$CONFIRM" != "RESTORE" ]; then
  echo "Usage: ops/restore-uploads.sh <uploads.tar.gz> RESTORE" >&2
  exit 2
fi

if [ ! -f "$BACKUP_PATH" ]; then
  echo "Backup file not found: $BACKUP_PATH" >&2
  exit 2
fi

echo "Restoring uploads from: $BACKUP_PATH"
cat "$BACKUP_PATH" | docker compose exec -T "$SERVICE" sh -c "mkdir -p '$UPLOAD_DIR' && find '$UPLOAD_DIR' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -C '$UPLOAD_DIR' -xzf -"
echo "Upload restore complete."
