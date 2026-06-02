param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [Parameter(Mandatory = $true)]
  [string]$ConfirmText,
  [string]$Service = "db",
  [string]$Database = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "cms" }),
  [string]$User = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "cms" })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($ConfirmText -ne "RESTORE") {
  throw "Refusing to restore. Pass -ConfirmText RESTORE to confirm this destructive database operation."
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupPath
Write-Host "Restoring PostgreSQL database '$Database' from $resolvedBackup"
Write-Host "This will drop and recreate the public schema inside the running Docker database service."

& docker compose exec -T $Service psql -U $User -d $Database -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to reset public schema with exit code $LASTEXITCODE"
}

Get-Content -LiteralPath $resolvedBackup | & docker compose exec -T $Service psql -U $User -d $Database -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
  throw "psql restore failed with exit code $LASTEXITCODE"
}

Write-Host "Restore complete."
