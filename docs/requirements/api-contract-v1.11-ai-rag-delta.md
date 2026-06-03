---
type: contract
project: dietManagement
doc_lane: requirements
version: v1.11
base: v1.10
updated_at: 2026-06-03
tags: [api, contract, ai, rag, delta]
---

# API Contract v1.11 — AI RAG 확장 (delta)

> 기준: `feature-diet-management-api-contract-v1.md` v1.4 + v1.10 stats delta.  
> PRD: `docs/requirements/feature-ai-rag-prd.md`

## 1) 공통

- 인증: Bearer JWT (기존과 동일)
- `traceId`: 오류·AI 요청 공통
- AI 전용 rate limit: **429** + `AI_RATE_LIMIT` (분당 10회, 사용자별)

## 2) 신규 엔드포인트

### `POST /me/ai/ask`

자연어 식단·영양 질의.

**Request**

```json
{
  "question": "최근 단백질 섭취 부족해?",
  "contextAnchor": "2026-06-03"
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `question` | Y | 1~500자 |
| `contextAnchor` | N | KST `YYYY-MM-DD`. 생략 시 KST 오늘 |

**Response 200**

```json
{
  "answer": "이번 주(5/25–5/31) 평균 단백질 섭취는 62g으로, 목표 80g 대비 부족합니다. ...",
  "intent": "stats_query",
  "citations": [
    {
      "type": "meal",
      "mealId": "clx...",
      "date": "2026-05-28",
      "foodName": "닭가슴살",
      "mealSlot": "LUNCH",
      "nutrients": { "protein": 32, "calories": 165, "carbohydrate": 0, "fat": 3.6 },
      "label": "5/28 점심 — 닭가슴살 (단백질 32g)"
    },
    {
      "type": "stat_period",
      "date": "2026-05-25",
      "label": "5/25–5/31 주간 집계",
      "nutrients": { "protein": 62, "calories": 1314, "carbohydrate": 140, "fat": 30 }
    }
  ],
  "computed": {
    "period": {
      "anchor": "2026-05-31",
      "from": "2026-05-25T00:00:00+09:00",
      "toExclusive": "2026-06-01T00:00:00+09:00",
      "label": "5/25 – 5/31",
      "timezone": "Asia/Seoul",
      "kind": "week_single"
    },
    "summary": { "protein": 62, "calories": 1314, "carbohydrate": 140, "fat": 30 },
    "goalComparison": {
      "proteinGoalG": 80,
      "proteinAvgGapG": -18,
      "proteinMet": false,
      "calorieGoalKcal": 2000,
      "calorieMet": true
    },
    "mealCount": 12,
    "aggregation": "dailyAverage",
    "periodMeta": { "recordedDays": 5, "calendarDays": 7 }
  },
  "isStale": false,
  "staleHours": null,
  "aggregatedAt": "2026-06-03T06:00:00+09:00",
  "llm": {
    "provider": "ollama",
    "model": "qwen2.5:3b",
    "used": true
  },
  "disclaimer": "본 답변은 추정 권장값·일반 정보이며, 의료 진단·치료·처방을 대체하지 않습니다."
}
```

**`computed.period.kind`**

| 값 | 설명 |
|----|------|
| `day_single` | anchor 하루(KST) |
| `week_single` | anchor가 속한 **1주(일~토 7일)** — stats v1.10 6주 윈도우 **아님** |
| `month_single` | anchor가 속한 **1달** |

**citation `stat_period.nutrients`**: 해당 `period`의 **기록일 일평균**(=`computed.summary`와 동일 스케일). 주간 **합계(434g 등)** 를 넣지 않음.

**의도(`intent`)**

| 값 | 설명 |
|----|------|
| `stats_query` | 기간·영양소 집계 질문 (MVP) |
| `knowledge_query` | 일반 영양 지식 (**2차**) |
| `semantic_meal` | 과거 기록 의미 검색 (**2차**) |
| `unknown` | 분류 실패 또는 2차 intent — 안내 + 예시 질문 |

**오류**

| HTTP | code | 조건 |
|------|------|------|
| 401 | `AUTH_UNAUTHORIZED` | |
| 422 | `VALIDATION_FAILED` | question **공백**/형식, anchor 형식, **미래 anchor** (`details.field`) |
| 422 | `AI_QUESTION_TOO_LONG` | 500자 초과 |
| 429 | `AI_RATE_LIMIT` | |
| 500 | (공통) | DB·집계 실패 — **LLM fallback 없음** |
| 503 | `AI_LLM_UNAVAILABLE` | LLM 실패 **且** 템플릿 fallback도 불가 |

**Fallback 정책**

- LLM 타임아웃/연결 실패 시: `llm.used=false`, `answer`는 **서버 템플릿**으로 생성. HTTP **200** 유지. `computed`·`citations`는 **동일**
- LLM 응답 본문에 `computed`와 **불일치하는 수치**가 있으면 서버가 **템플릿 answer로 대체**(환각 방지)
- 집계 데이터 없음: `computed.mealCount=0`, `goalComparison: null` 가능, citation 빈 배열 — HTTP **200** + “기록이 없습니다”
- 프로필 목표 미설정: `goalComparison: null`, `answer`는 섭취 집계만 서술
- **DB/집계 오류**: HTTP **500** — LLM fallback **하지 않음**
- `isStale=true`: HTTP 200 + stats와 동일 stale 메타. `answer`에 지연 안내 문구 **선택** 포함
- **결제**: AI 엔드포인트는 `402`/`PAYMENT_REQUIRED` **반환하지 않음**(현행 무료 출시)

---

### `GET /me/ai/reports/weekly`

주간 식단 리포트.

**Query**

| 필드 | 필수 | 설명 |
|------|------|------|
| `anchor` | N | KST `YYYY-MM-DD`. 해당 날짜가 속한 주(일~토). 생략=오늘 |

**Response 200**

```json
{
  "generatedAt": "2026-06-03T09:00:00+09:00",
  "period": {
    "anchor": "2026-06-01",
    "from": "2026-05-25T00:00:00+09:00",
    "toExclusive": "2026-06-01T00:00:00+09:00",
    "label": "5/25 – 5/31",
    "timezone": "Asia/Seoul"
  },
  "sections": {
    "overview": {
      "mealCount": 18,
      "recordedDays": 5,
      "summary": { "protein": 62, "calories": 1314, "carbohydrate": 140, "fat": 30 }
    },
    "macroBreakdown": {
      "proteinPct": 22,
      "carbPct": 48,
      "fatPct": 30
    },
    "goalAchievement": {
      "proteinMetDays": 2,
      "calorieMetDays": 4,
      "countedDays": 5
    },
    "highlights": [
      { "type": "top_protein_meal", "citationIndex": 0 },
      { "type": "low_protein_day", "date": "2026-05-27" }
    ],
    "suggestions": [
      "단백질 목표 대비 평균 18g 부족합니다. 아침에 계란·그릭요거트를 추가해 보세요."
    ]
  },
  "summaryText": "이번 주는 5일 기록, 평균 단백질 62g...",
  "citations": [ "..." ],
  "isStale": false,
  "staleHours": null,
  "aggregatedAt": "2026-06-03T06:00:00+09:00",
  "llm": { "provider": "ollama", "model": "qwen2.5:3b", "used": true }
}
```

- `goalComparison` 생략 가능: 프로필 목표 미설정 시 **`null`**

- `sections.*` 수치는 **SQL 집계 고정**. `summaryText`·`suggestions`만 LLM/템플릿.
- **집계 범위**: anchor가 속한 **단일 KST 주(일~토 7일)**. `GET /stats?range=week`의 **6주 버킷 윈도우와 다름**.
- `overview.summary`: 해당 주 **기록일 일평균** (`dailyAverage`). stats v1.10 `goalMet`·`WeightEntry` 스냅샷 규칙 준수.
- 기록 0건: HTTP 200, 빈 `highlights`, 안내 `summaryText`.

**오류**: 401, 422(anchor), 503(극단적 내부 오류)

---

### `POST /me/ocr/feedback`

OCR 결과 사용자 수정 피드백. **`POST /meals` 또는 `PUT /meals/{id}` 성공 후**, OCR 값을 사용자가 수정한 경우에만 호출.

**Request**

```json
{
  "ocrRequestId": null,
  "imageHash": "sha256:abc...",
  "confidence": 0.82,
  "rawOcr": {
    "calories": 450,
    "protein": 12,
    "carbohydrate": 60,
    "fat": 15,
    "rawText": "영양정보 1회 제공량 ..."
  },
  "corrected": {
    "calories": 480,
    "protein": 15,
    "carbohydrate": 58,
    "fat": 16
  },
  "mealId": "clx..."
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `rawOcr` | Y | OCR 엔진 원본 |
| `corrected` | Y | 사용자 확정 |
| `confidence` | N | `POST /nutrition/ocr`의 `confidence` |
| `mealId` | N | 연결 meal (**본인 active**) |
| `imageHash` | N | dedup용 |
| `ocrRequestId` | N | 추후 OCR 세션 ID |

**Response 201**

```json
{
  "id": "clxfb...",
  "changedFields": ["calories", "protein", "carbohydrate", "fat"],
  "indexed": true
}
```

- `indexed`: 벡터 인덱싱 성공 여부 (실패해도 201)
- `rawOcr`·`corrected` diff **없음** → 클라이언트 **호출하지 않음**. 서버가 받으면 422 `VALIDATION_FAILED` (`field: corrected`, `reason: no_diff`)

- 동일 `userId`+`mealId`+동일 diff **재제출**: 200, 기존 `id` 반환(멱등)
- 네트워크/5xx: 클라이언트 **무시**(MVP). meal 저장 UX에 영향 없음

**오류**: 401, 422(필드 누락·음수·no_diff), 404(`mealId` 타 사용자 또는 inactive)

## 3) 내부/비동기 (외부 계약 아님, 구현 참고)

- `AiIndexWorker`: meal create/update, ocr feedback → embed → **pgvector `AiEmbedding`**
- 환경: `VECTOR_BACKEND=pgvector` (고정), `LLM_BASE_URL`, `DATABASE_URL`

## 4) Prisma / DB (예정)

### pgvector — `AiEmbedding` (마이그레이션 적용됨, Prisma 모델 외 raw SQL)

- `20260603140000_pgvector_ai_embeddings`
- `CREATE EXTENSION vector`; `embedding vector(768)`; `collection` = `meals`|`ocr_raw`|…

### Prisma 모델 (단계 3)

```prisma
model OcrFeedback {
  id            String   @id @default(cuid())
  userId        String
  mealId        String?
  imageHash     String?
  rawJson       Json
  correctedJson Json
  changedFields String[]
  createdAt     DateTime @default(now())
  user User @relation(...)
  meal Meal? @relation(...)
  @@index([userId, createdAt])
}

model AiQueryLog {
  id        String   @id @default(cuid())
  userId    String
  question  String   /// 프로덕션 90일 rolling 후 삭제 또는 hard-delete 시 파기
  intent    String
  usedLlm   Boolean
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}
```

- `OcrFeedback`·`AiEmbedding`(user-scoped row): hard delete 시 **함께 파기**
- `ocr_corrections` collection: `userId` null, diff 패턴만

## 5) 오류 코드 추가 (`contracts/errorCodes.ts`)

| code | HTTP | message (ko) |
|------|------|----------------|
| `AI_RATE_LIMIT` | 429 | AI 질의 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. |
| `AI_LLM_UNAVAILABLE` | 503 | AI 분석 서비스를 일시적으로 사용할 수 없습니다. |
| `AI_QUESTION_TOO_LONG` | 422 | 질문은 500자 이내로 입력해 주세요. |

## 6) 에러 코드 → UX 매핑 (state-mapping AI 절 초안)

| code | HTTP | UX (user-web) |
|------|------|-------------|
| `AUTH_UNAUTHORIZED` / `AUTH_TOKEN_EXPIRED` | 401 | refresh 1회 → 로그인 |
| `VALIDATION_FAILED` | 422 | `details.field` 인라인(question/contextAnchor) |
| `AI_QUESTION_TOO_LONG` | 422 | 글자수 초과 안내 |
| `AI_RATE_LIMIT` | 429 | info 토스트 + 질문 유지 |
| (집계/DB 실패) | 500 | error 토스트 + **재시도** |
| `AI_LLM_UNAVAILABLE` | 503 | error 토스트 + 재시도 |
| LLM fallback 성공 | 200, `llm.used=false` | info “집계 기준 답변” + citation 유지 |
| 기록 없음 | 200, `mealCount=0` | **빈 데이터** + 기록 CTA |
| `isStale=true` | 200 | stats 동일 지연 배너 |

## 7) 클라이언트 매핑 (요약)

| 화면 | API | 상태 |
|------|-----|------|
| AI 질의 (`/ai`) | `POST /me/ai/ask` | 로딩/오류/fallback/stale 배너 |
| 주간 리포트 (`/ai/report`) | `GET /me/ai/reports/weekly` | 빈=기록 없음 CTA |
| OCR meal 저장 후 (모바일) | `POST /me/ocr/feedback` | 2차 — user-web MVP 범위外 |

## 8) 기존 계약과의 관계

- OCR 월간 쿼터(`OCR_FREE_QUOTA_EXCEEDED`)와 AI rate limit(**`AI_RATE_LIMIT`**) **독립**
- AI 집계는 **`active=true` meal**만 — `GET /meals` 기본과 동일
- 목표 비교: recommendation v14 + stats v1.8 WeightEntry 스냅샷
- **프로덕션 Tier B** LLM 사용 전 `privacy.md` v5(수탁자·AI 처리 목적) 갱신 필수

## 9) Gate 2 병렬 조건

- [ ] 본 delta + PRD **approved**
- [x] AI 화면 디자인 — `docs/design/user-web-ai-spec.md` (user-web 단일안)
- [ ] `computed`·`citations` 필드 FE/BE 동시 반영
