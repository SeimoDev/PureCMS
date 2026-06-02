# Operations

## Quality gate

Run the repository-level quality gate before packaging a release or rebuilding the production image.

PowerShell:

```powershell
.\ops\quality-check.ps1
.\ops\quality-check.ps1 -SkipFrontendBuild
.\ops\quality-check.ps1 -IncludeDockerBuild
```

Linux/macOS shell:

```sh
sh ops/quality-check.sh
sh ops/quality-check.sh --skip-frontend-build
sh ops/quality-check.sh --include-docker-build
```

- The quality gate runs `go test ./...` in `backend/`, then `npm test`, `npm run lint`, and `npm run build` in `frontend/`.
- Use the skip flag only during quick iteration; release checks should include the frontend production build.
- Use the Docker flag on machines with Docker installed to build both production images locally; GitHub Actions always builds both images.

## PostgreSQL backups

The admin JSON backup is useful for moving CMS content, media metadata, users, audit logs, and translation caches through the management UI. A production deployment should also keep database-level PostgreSQL backups so the whole database can be restored after a broken migration, volume failure, or operator mistake.

PowerShell:

```powershell
.\ops\backup-postgres.ps1
.\ops\backup-uploads.ps1
.\ops\restore-postgres.ps1 -BackupPath .\backups\postgres-YYYYMMDD-HHMMSS.sql -ConfirmText RESTORE
.\ops\restore-uploads.ps1 -BackupPath .\backups\uploads-YYYYMMDD-HHMMSS.tar.gz -ConfirmText RESTORE
```

Linux/macOS shell:

```sh
sh ops/backup-postgres.sh
sh ops/backup-uploads.sh
sh ops/restore-postgres.sh backups/postgres-YYYYMMDD-HHMMSS.sql RESTORE
sh ops/restore-uploads.sh backups/uploads-YYYYMMDD-HHMMSS.tar.gz RESTORE
```

- `ops/backup-postgres.ps1` and `ops/backup-postgres.sh` run `docker compose exec -T db pg_dump` against the running Compose database and write SQL files to `backups/`.
- `ops/restore-postgres.ps1` and `ops/restore-postgres.sh` require the explicit confirmation phrase `RESTORE`, recreate the `public` schema, and import with `psql -v ON_ERROR_STOP=1`.
- `ops/backup-uploads.ps1` and `ops/backup-uploads.sh` stream `/app/uploads` from the running `api` container into a compressed tar archive and write a SHA256 file when the platform supports it.
- `ops/restore-uploads.ps1` and `ops/restore-uploads.sh` require the explicit confirmation phrase `RESTORE`, clear `/app/uploads`, and unpack the archive through the running `api` container.
- Stop frontend writes or enable maintenance mode before restoring. Restore PostgreSQL first, then restore uploads, then verify `/api/health` and a few representative `/uploads/...` URLs.
