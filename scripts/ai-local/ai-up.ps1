#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host ''
  Write-Host '[ai:up] Docker를 찾을 수 없습니다.' -ForegroundColor Yellow
  Write-Host ''
  Write-Host '선택 1 — Docker Desktop 설치 (compose 경로)' -ForegroundColor Cyan
  Write-Host '  https://www.docker.com/products/docker-desktop/'
  Write-Host '  설치 후 PC 재시작 → 터미널 새로 열기 → npm run ai:up'
  Write-Host ''
  Write-Host '선택 2 — Docker 없이 Windows 네이티브' -ForegroundColor Cyan
  Write-Host '  docs/agent/ai-local-demo.md §「Docker 없이 (Windows)」 참고'
  Write-Host '  요약: Ollama(Windows 앱) + Postgres pgvector + migrate'
  Write-Host ''
  exit 1
}

docker compose -f docker-compose.ai.yml up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host 'OK: docker-compose.ai.yml 기동됨 (Postgres pgvector + Ollama). 다음: npm run db:migrate && npm run ai:pull-models' -ForegroundColor Green
