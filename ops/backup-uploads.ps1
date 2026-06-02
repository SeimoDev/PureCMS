param(
  [string]$OutputDir = "backups",
  [string]$Service = "api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$uploadDir = "/app/uploads"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$backupPath = Join-Path $OutputDir "uploads-$timestamp.tar.gz"
$containerBackup = "/tmp/uploads-$timestamp.tar.gz"

Write-Host "Creating upload backup: $backupPath"
& docker compose exec -T $Service tar -C $uploadDir -czf $containerBackup .
if ($LASTEXITCODE -ne 0) {
  & docker compose exec -T $Service rm -f $containerBackup | Out-Null
  throw "upload backup failed with exit code $LASTEXITCODE"
}
& docker compose cp "${Service}:$containerBackup" $backupPath
if ($LASTEXITCODE -ne 0) {
  & docker compose exec -T $Service rm -f $containerBackup | Out-Null
  Remove-Item -LiteralPath $backupPath -ErrorAction SilentlyContinue
  throw "copying upload backup failed with exit code $LASTEXITCODE"
}
& docker compose exec -T $Service rm -f $containerBackup | Out-Null

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath
$hash.Hash | Set-Content -Encoding ascii -LiteralPath "$backupPath.sha256"
Write-Host "Backup complete: $backupPath"
Write-Host "SHA256: $($hash.Hash)"
