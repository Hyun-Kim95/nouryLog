#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

$models = @('qwen2.5:3b', 'nomic-embed-text')

if (Get-Command docker -ErrorAction SilentlyContinue) {
  $running = docker compose -f docker-compose.ai.yml ps --services --filter status=running 2>$null
  if ($running -match 'ollama') {
    foreach ($m in $models) {
      Write-Host "Pulling $m (docker ollama)..."
      docker compose -f docker-compose.ai.yml exec ollama ollama pull $m
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    Write-Host 'OK: models pulled via Docker' -ForegroundColor Green
    exit 0
  }
}

if (Get-Command ollama -ErrorAction SilentlyContinue) {
  foreach ($m in $models) {
    Write-Host "Pulling $m (native ollama)..."
    ollama pull $m
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  Write-Host 'OK: models pulled via native Ollama' -ForegroundColor Green
  exit 0
}

Write-Host ''
Write-Host '[ai:pull-models] Ollama not found.' -ForegroundColor Yellow
Write-Host '  Run: npm run ai:up  then retry'
Write-Host '  Or install from https://ollama.com/download/windows and run: ollama pull qwen2.5:3b'
Write-Host ''
exit 1
