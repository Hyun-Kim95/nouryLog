# AI 로컬 데모 (Tier A) — Postgres **pgvector** + Ollama

> **Deprecated (2026-06-15):** RAG·Ollama 로컬 데모는 **식단 인사이트** 전환으로 더 이상 필요하지 않습니다.  
> 인사이트 스모크: `npm run insights:smoke:summary` (일반 `dev:server` + `seed:demo-user`).

PRD: `docs/requirements/feature-ai-rag-prd.md` (deprecated — see v1.14 insights delta)  
**벡터 SSOT: PostgreSQL pgvector** (로컬 = Railway, Chroma **미사용**)

## 사전 요구

- **경로 A**: Docker Desktop + Node 22+ → `db`(pgvector) + `ollama` 2서비스만
- **경로 B (Docker 없음)**: [Ollama Windows](https://ollama.com/download/windows) + Postgres(Railway URL 또는 로컬 pgvector 이미지)
- `apps/server/.env` (JWT + `AI_ENABLED=1` + `VECTOR_BACKEND=pgvector`)

## 1) 인프라 기동

### 경로 A — Docker Compose (권장)

```powershell
cd d:\cursor\dietManagement
npm run ai:up
npm run db:migrate    # CREATE EXTENSION vector + AiEmbedding 테이블
```

(`docker` 없으면 스크립트가 설치 안내 후 종료)

### Windows 로컬 PostgreSQL과 5432 충돌

PC에 **PostgreSQL 17/18**이 `5432`(또는 `5433`)를 쓰면 Docker `db`는 **호스트 15432**로 매핑됩니다.

- `DATABASE_URL` → `postgresql://diet:diet@localhost:15432/diet?schema=public` (`.env.ai.example` 기준)
- AI 로컬 개발 데이터는 **Docker 볼륨**에만 있음 (기존 `diet_app@5432` Windows DB와 **별도**)
- 5432만 쓰려면 **관리자 PowerShell**에서 Windows PG 중지 후 compose 포트를 5432로 되돌리기:

```powershell
Stop-Service postgresql-x64-17, postgresql-x64-18 -Force
```

- **Chroma 컨테이너 없음** — 벡터는 **같은 Postgres** 안 pgvector
- Docker 디스크는 **D 드라이브**로 옮기는 것 권장 (C 9GB 여유 적을 때)

### 경로 B — Docker 없이 (Windows)

1. **Ollama** — https://ollama.com/download/windows  
2. **모델**:

```powershell
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

3. **PostgreSQL + pgvector** (택1):
   - **Railway** `DATABASE_URL` → `npm run db:migrate` (프로덕션 DB 건드림 **주의**)
   - 로컬 **pgvector/pgvector:pg16** Docker **db만** 단독 실행
   - Windows Postgres + `vector` 확장 수동 설치

4. **API env** — `.env.ai.example` merge + `AI_ENABLED=1`

```powershell
npm run db:migrate
npm run dev:server
npm run ai:smoke
```

## 2) Ollama 모델 pull

```powershell
npm run ai:pull-models
```

## 3) 환경 변수 (핵심)

| 변수 | 값 |
|------|-----|
| `DATABASE_URL` | Postgres (로컬 compose 또는 Railway) |
| `VECTOR_BACKEND` | **`pgvector`** (고정) |
| `LLM_BASE_URL` | `http://localhost:11434` |
| `AI_ENABLED` | `1` |

~~`CHROMA_URL`~~ — **사용하지 않음**

## 4) RAG 인덱스 (deprecated — 2026-06-15 제거)

> `nutrition-kb/`, `ai:backfill`, `ai:seed-kb`, meal 임베딩 훅은 삭제되었습니다. 아래는 역사 참고용입니다.

Ollama **`nomic-embed-text`** 필요 (`npm run ai:pull-models`).

```powershell
npm run prisma:seed -w @diet-management/server
npm run ai:backfill   # tsx — .env 로드
npm run ai:seed-kb
```

- ~~**nutrition_kb** md 9개~~ — 디렉터리 삭제됨
- ~~meal 저장·수정 시 비동기 재인덱싱~~ — 제거됨
- OCR 수정: `POST /ocr/feedback` — **DB 저장만** (임베딩 없음)

## 5) 모바일 식단 인사이트 + API

```powershell
npm run dev:server          # PORT 충돌 시: $env:PORT='3002'
npm run dev:mobile
```

- API 스모크 (포트 맞출 것):  
  `$env:API_URL='http://localhost:3002'; npm run insights:smoke:summary`  
  `$env:API_URL='http://localhost:3002'; npm run insights:smoke:weekly`  
  `$env:API_URL='http://localhost:3002'; npm run insights:smoke:monthly`

### 모바일 수동 DoD

1. **AI 코치** — 주간 리포트 카드: 핵심 요약 칩 · AI 코멘트 · 근거 기록 · 다음 주 목표
2. **통계 · 월** — 차트 아래 「이번 달 영양 패턴」 카드
3. 빈 기록 — 안내 + 기록 CTA (코치)
4. 면책 문구 표시 (비진단)
5. `AI_ENABLED=0` — 오류 배너

계약: [`docs/requirements/api-contract-v1.13-ai-period-reports-delta.md`](../requirements/api-contract-v1.13-ai-period-reports-delta.md)

| 유형 | 예시 질문 |
|------|-----------|
| stats_query | 이번 주 단백질 섭취 어때? |
| knowledge_query | 단백질 권장량이란 무엇인가요? |
| semantic_meal | 예전에 먹었던 닭가슴살 비슷한 식사 찾아줘 |

## 6) 헬스 확인

```powershell
npm run ai:smoke
```

- `GET /health/ai` → `vector.backend: "pgvector"`, `extensionInstalled`, `embeddingTableReady`
- `ready: true` = Ollama chat 모델 + **pgvector 마이그레이션** OK

`embeddingTableReady: false` → `npm run db:migrate` 재실행

## Railway (사용자 서비스)

- **같은 Postgres**에 `vector` 확장 + `AiEmbedding` (마이그레이션 deploy)
- **Ollama는 Railway에 없음** — LLM은 Groq/템플릿 등 env로 연결 (PRD Tier B)
- 로컬과 **벡터·표 데이터 스키마 동일**, LLM env만 다름

## 중지

```powershell
npm run ai:down
```

볼륨 삭제: `docker compose -f docker-compose.ai.yml down -v`
