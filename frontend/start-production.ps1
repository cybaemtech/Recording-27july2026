# start-production.ps1
# PowerShell script to start the Employee Monitoring System API server in production mode.

$Cwd = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $Cwd "artifacts\api-server")

Write-Host "Starting Employee Monitoring System API backend..." -ForegroundColor Green
Write-Host "Check http://localhost:3000/api/healthz to verify backend status." -ForegroundColor Yellow

pnpm run start
