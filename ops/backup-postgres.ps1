param(
  [string]$OutputDir = "backups",
  [string]$Service = "db",
  [string]$Database = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "cms" }),
  [string]$User = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "cms" })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$backupPath = Join-Path $OutputDir "postgres-$timestamp.sql"

Write-Host "Creating PostgreSQL backup: $backupPath"
& docker compose exec -T $Service pg_dump -U $User -d $Database --format=plain --no-owner --no-acl > $backupPath
if ($LASTEXITCODE -ne 0) {
  Remove-Item -LiteralPath $backupPath -ErrorAction SilentlyContinue
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath
$hash.Hash | Set-Content -Encoding ascii -LiteralPath "$backupPath.sha256"
Write-Host "Backup complete: $backupPath"
Write-Host "SHA256: $($hash.Hash)"
