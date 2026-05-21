# Sync apps/mobile/.env -> EAS project env (production + development).
# Requires: eas-cli login, run from apps/mobile.
param(
  [string[]] $Environments = @('production', 'development')
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dotenvPath = Join-Path $root '.env'
if (-not (Test-Path $dotenvPath)) {
  Write-Error ".env not found at $dotenvPath"
}

function Parse-Dotenv([string] $path) {
  $map = @{}
  Get-Content $path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    if ($val) { $map[$key] = $val }
  }
  return $map
}

# Keys used at EAS build time (app.config + JS).
$keys = @(
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_PLAY_BILLING_ENABLED',
  'EXPO_PUBLIC_NAVER_CLIENT_ID',
  'EXPO_PUBLIC_NAVER_CLIENT_SECRET',
  'EXPO_PUBLIC_NAVER_APP_NAME',
  'EXPO_PUBLIC_NAVER_IOS_URL_SCHEME',
  'EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'ADMOB_ANDROID_APP_ID',
  'EXPO_PUBLIC_ADMOB_BANNER_ANDROID'
)

# EXPO_PUBLIC_* cannot use visibility=secret on EAS; use sensitive for client secret.
$sensitiveKeys = @{ 'EXPO_PUBLIC_NAVER_CLIENT_SECRET' = $true }

$vars = Parse-Dotenv $dotenvPath
if (-not $vars['EXPO_PUBLIC_PLAY_BILLING_ENABLED']) {
  $vars['EXPO_PUBLIC_PLAY_BILLING_ENABLED'] = 'false'
}

Push-Location $root
try {
  foreach ($envName in $Environments) {
    Write-Host "`n=== EAS environment: $envName ===" -ForegroundColor Cyan
    foreach ($key in $keys) {
      if (-not $vars.ContainsKey($key) -or -not $vars[$key]) {
        Write-Host "  skip $key (empty in .env)" -ForegroundColor Yellow
        continue
      }
      $visibility = if ($sensitiveKeys[$key]) { 'sensitive' } else { 'plaintext' }
      Write-Host "  set $key ($visibility)"
      $args = @(
        'env:create',
        '--name', $key,
        '--value', $vars[$key],
        '--type', 'string',
        '--visibility', $visibility,
        '--scope', 'project',
        '--environment', $envName,
        '--non-interactive',
        '--force'
      )
      & npx eas-cli @args 2>&1 | ForEach-Object { Write-Host "    $_" }
      if ($LASTEXITCODE -ne 0) {
        Write-Error "eas env:create failed for $key ($envName)"
      }
    }
  }
  Write-Host "`nDone. Verify: npx eas-cli env:list production --format long" -ForegroundColor Green
}
finally {
  Pop-Location
}
