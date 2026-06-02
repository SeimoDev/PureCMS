param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ConfirmText = "",
  [string]$Service = "api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($ConfirmText -ne "RESTORE") {
  throw "Refusing to restore uploads. Re-run with -ConfirmText RESTORE"
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupPath
$uploadDir = "/app/uploads"
$containerBackup = "/tmp/uploads-restore.tar.gz"

Write-Host "Restoring uploads from: $resolvedBackup"
& docker compose cp $resolvedBackup "${Service}:$containerBackup"
if ($LASTEXITCODE -ne 0) {
  throw "copying upload backup failed with exit code $LASTEXITCODE"
}
& docker compose exec -T $Service sh -c "mkdir -p '$uploadDir' && find '$uploadDir' -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -C '$uploadDir' -xzf '$containerBackup' && rm -f '$containerBackup'"
if ($LASTEXITCODE -ne 0) {
  & docker compose exec -T $Service rm -f $containerBackup | Out-Null
  throw "upload restore failed with exit code $LASTEXITCODE"
}
Write-Host "Upload restore complete."
