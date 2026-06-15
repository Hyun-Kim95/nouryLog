---
type: contract
project: dietManagement
doc_lane: requirements
version: v1.14
base: v1.13
updated_at: 2026-06-15
tags: [api, contract, insights, delta]
---

# API Contract v1.14 — 식단 인사이트 (delta)

> 기준: `api-contract-v1.13-ai-period-reports-delta.md`  
> **제거:** 전체 `/me/ai/*`, `POST /me/ai/ask`, `GET /health/ai`  
> **대체:** `/me/insights/*` — SQL 집계 + 규칙 템플릿만 (RAG·LLM 없음)

## 1) 신규 엔드포인트

### `GET /me/insights/summary`

홈 카드·식단 인사이트 상세용 read API. (구 `GET /me/ai/coach/summary`)

**Query:** `anchor` (선택, KST `YYYY-MM-DD`, 생략 시 오늘)

**Response 200:** v1.12 coach/summary와 동일 구조에서 아래 필드 **제거**

- `suggestedQuestions` — 삭제 (질문하기 기능 제거)
- `llm` — 없음

`insight.source`는 `template` 고정.

### `GET /me/insights/reports/weekly`

주간 패턴 리포트. (구 `GET /me/ai/reports/weekly`)

**Response 200:** v1.13 weekly와 동일 `sections` 구조. `summaryText`는 **서버 템플릿만**. `llm` 필드 **삭제**.

### `GET /me/insights/reports/monthly`

월간 패턴 리포트. (구 `GET /me/ai/reports/monthly`)

**Response 200:** v1.13 monthly와 동일. `llm` 필드 **삭제**.

## 2) 오류

| HTTP | code | 조건 |
|------|------|------|
| 401 | `AUTH_*` | 미인증 |
| 403 | `AUTH_FORBIDDEN` | 비활성 회원 |
| 422 | `VALIDATION_FAILED` | anchor 형식·미래일 |
| 500 | `INTERNAL_SERVER_ERROR` | DB·집계 실패 |

`AI_LLM_UNAVAILABLE`, `AI_RATE_LIMIT`, `AI_QUESTION_TOO_LONG` — **미사용**

## 3) 인프라

- `AI_ENABLED`, Ollama, pgvector **런타임 의존 없음**
- `AiPeriodReport` 캐시 테이블은 유지 (주간·월간 리포트)
- DB 마이그레이션 `20260615120000_drop_ai_rag_tables`: `AiQueryLog`, `AiEmbedding` DROP, `vector` extension DROP
- 개인정보처리방침 v5 (`20260615120100_policy_insights_v5`): 식단 인사이트 명시

## 4) 삭제 엔드포인트

- `POST /me/ai/ask`
- `GET /me/ai/coach/summary`
- `GET /me/ai/reports/weekly`
- `GET /me/ai/reports/monthly`
- `GET /health/ai`
