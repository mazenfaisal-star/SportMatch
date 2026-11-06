$ErrorActionPreference = 'Stop'

Write-Host 'SportMatch security checks' -ForegroundColor Cyan

if (-not (Test-Path 'package.json')) {
  throw 'Run this script from the SportMatchApp project folder.'
}

if (-not (Test-Path 'package-lock.json')) {
  Write-Host 'No package-lock.json found. Installing exact direct dependencies and generating a lockfile...'
  npm install
} else {
  npm ci
}

if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }

npm audit --audit-level=moderate
if ($LASTEXITCODE -ne 0) { throw 'npm audit reported a vulnerability or could not complete.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }

npm run check:secrets
if ($LASTEXITCODE -ne 0) { throw 'Potential secret exposure was found.' }

if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
  gitleaks detect --source . --redact
  if ($LASTEXITCODE -ne 0) { throw 'Gitleaks detected a possible secret in the repository/history.' }
} else {
  Write-Warning 'Gitleaks is not installed. The local file scan does not inspect Git history.'
}

Write-Host 'Local automated checks completed. This does not replace Supabase/Vercel dashboard review or access-control tests.' -ForegroundColor Green
