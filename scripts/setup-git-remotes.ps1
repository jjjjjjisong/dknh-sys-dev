param(
  [switch]$FixDevOrigin,
  [switch]$Fetch
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$expectedOriginUrl = 'https://github.com/jjjjjjisong/dknh-sys.git'
$expectedDevOriginUrl = 'https://github.com/jjjjjjisong/dknh-sys-dev.git'

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & git -C $repoRoot @Arguments
}

try {
  $null = Invoke-Git @('rev-parse', '--show-toplevel') | Out-Null
} catch {
  Write-Error "Git repository not found under '$repoRoot'. Run this script from inside the project clone."
  exit 1
}

Write-Host "Repository root: $repoRoot"

$originUrl = ''
try {
  $originUrl = (Invoke-Git @('remote', 'get-url', 'origin') | Select-Object -First 1).Trim()
} catch {
  Write-Error "The 'origin' remote is missing. Configure origin first, then rerun this script."
  exit 1
}

if ($originUrl -ne $expectedOriginUrl) {
  Write-Warning "origin points to '$originUrl'"
  Write-Warning "Expected production remote: '$expectedOriginUrl'"
} else {
  Write-Host "origin is configured for the production repository."
}

$devOriginExists = $true
$devOriginUrl = ''
try {
  $devOriginUrl = (Invoke-Git @('remote', 'get-url', 'dev-origin') | Select-Object -First 1).Trim()
} catch {
  $devOriginExists = $false
}

if (-not $devOriginExists) {
  Write-Host "Adding dev-origin -> $expectedDevOriginUrl"
  Invoke-Git @('remote', 'add', 'dev-origin', $expectedDevOriginUrl) | Out-Null
  $devOriginUrl = $expectedDevOriginUrl
} elseif ($devOriginUrl -ne $expectedDevOriginUrl) {
  Write-Warning "dev-origin points to '$devOriginUrl'"
  Write-Warning "Expected development remote: '$expectedDevOriginUrl'"

  if ($FixDevOrigin) {
    Write-Host "Updating dev-origin to the standard development repository."
    Invoke-Git @('remote', 'set-url', 'dev-origin', $expectedDevOriginUrl) | Out-Null
    $devOriginUrl = $expectedDevOriginUrl
  } else {
    Write-Host "Rerun with -FixDevOrigin to update the dev-origin URL automatically."
  }
} else {
  Write-Host "dev-origin is already configured for the development repository."
}

if ($Fetch) {
  Write-Host ''
  Write-Host 'Fetching origin and dev-origin...'
  try {
    Invoke-Git @('fetch', 'origin') | Out-Null
    Invoke-Git @('fetch', 'dev-origin') | Out-Null
  } catch {
    Write-Warning "Fetch failed. Check network access and GitHub credentials, then retry with -Fetch."
  }
} else {
  Write-Host ''
  Write-Host 'Fetch skipped. Rerun with -Fetch if you want to refresh remote branch lists now.'
}

Write-Host ''
Write-Host 'Remote summary:'
Invoke-Git @('remote', '-v')

Write-Host ''
Write-Host 'Branch summary:'
Invoke-Git @('branch', '-a', '-vv')

Write-Host ''
Write-Host 'Standard remote setup complete.'
Write-Host "Production deploy line: origin/main"
Write-Host "Development deploy line: dev-origin/main"
