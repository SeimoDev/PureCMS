param(
  [switch]$SkipFrontendBuild,
  [switch]$IncludeDockerBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Invoke-Step {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string[]]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  Push-Location $WorkingDirectory
  try {
    $Executable = $Command[0]
    $StepArgs = @()
    if ($Command.Length -gt 1) {
      $StepArgs = $Command[1..($Command.Length - 1)]
    }
    & $Executable @StepArgs
  } finally {
    Pop-Location
  }
}

Invoke-Step -Name "Backend tests" -WorkingDirectory (Join-Path $repoRoot "backend") -Command @("go", "test", "./...")
Invoke-Step -Name "Frontend tests" -WorkingDirectory (Join-Path $repoRoot "frontend") -Command @("npm", "test")
Invoke-Step -Name "Frontend lint" -WorkingDirectory (Join-Path $repoRoot "frontend") -Command @("npm", "run", "lint")

if (-not $SkipFrontendBuild) {
  Invoke-Step -Name "Frontend production build" -WorkingDirectory (Join-Path $repoRoot "frontend") -Command @("npm", "run", "build")
}

if ($IncludeDockerBuild) {
  Invoke-Step -Name "Backend Docker image build" -WorkingDirectory $repoRoot -Command @("docker", "build", "-t", "purecms-api:local", ".\backend")
  Invoke-Step -Name "Frontend Docker image build" -WorkingDirectory $repoRoot -Command @("docker", "build", "--build-arg", "VITE_API_BASE_URL=/api", "-t", "purecms-web:local", ".\frontend")
}

Write-Host ""
Write-Host "Quality checks passed."
