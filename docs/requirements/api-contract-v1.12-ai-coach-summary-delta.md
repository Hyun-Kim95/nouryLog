---
type: contract
project: dietManagement
doc_lane: requirements
version: v1.12
base: v1.11
updated_at: 2026-06-03
tags: [api, contract, ai, coach, delta]
---

# API Contract v1.12 — AI 코치 Summary (delta)

> **2026-06-16:** `apps/user-web` 제거. 소비자 UI SSOT는 `apps/mobile`.

> 기준: `api-contract-v1.11-ai-rag-delta.md`  
> PRD: `docs/requirements/feature-ai-rag-prd.md`  
> 소비자: `apps/user-web` AI Nutrition Coach 대시보드 (2단계)

## 1) 신규 엔드포인트

### `GET /me/ai/coach/summary`

코치 대시보드용 **단일 read** API. 주간·오늘 집계, 규칙 기반 인사이트, 근거 meal, 추천 질문을 한 응답에 제공한다.

**Query**

| 필드 | 필수 | 설명 |
|------|------|------|
| `anchor` | N | KST `YYYY-MM-DD`. 생략 시 KST 오늘. 해당 날짜가 속한 주(일~토) + 당일 집계 |

**Response 200**

```json
{
  "anchor": "2026-06-03",
  "today": {
    "period": {
      "anchor": "2026-06-03",
      "from": "2026-06-03T00:00:00+09:00",
      "toExclusive": "2026-06-04T00:00:00+09:00",
      "label": "6월 3일",
      "timezone": "Asia/Seoul",
      "kind": "day_single"
    },
    "summary": { "protein": 45, "calories": 1200, "carbohydrate": 120, "fat": 40 },
    "goalComparison": {
      "proteinGoalG": 80,
      "proteinAvgGapG": -35,
      "proteinMet": false,
      "calorieGoalKcal": 2000,
      "calorieMet": true
    },
    "mealCount": 3
  },
  "week": {
    "period": {
      "anchor": "2026-06-03",
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
    "mealCount": 18,
    "recordedDays": 5,
    "goalAchievement": {
      "proteinMetDays": 2,
      "calorieMetDays": 4,
      "countedDays": 5,
      "proteinShortDays": 3,
      "calorieShortDays": 1
    },
    "macroBreakdown": { "proteinPct": 22, "carbPct": 48, "fatPct": 30 }
  },
  "insight": {
    "text": "이번 주 단백질 목표를 채운 날이 2일뿐입니다. 아침·간식에 단백질 식품을 추가해 보세요.",
    "source": "template"
  },
  "evidenceMeals": [
    {
      "type": "meal",
      "mealId": "clx...",
      "date": "2026-06-01",
      "foodName": "토스트",
      "mealSlot": "BREAKFAST",
      "nutrients": { "protein": 8, "calories": 250, "carbohydrate": 40, "fat": 6 },
      "label": "6월 1일 아침 — 토스트 (단백질 8g)"
    }
  ],
  "frequentFoods": [{ "name": "닭가슴살", "count": 5 }],
  "suggestedQuestions": [
    { "label": "이번 주 식단 평가", "question": "이번 주 단백질 섭취 어때?", "intentHint": "stats_query" },
    { "label": "비슷한 식사 찾기", "question": "예전에 먹었던 닭가슴살 비슷한 식사 찾아줘", "intentHint": "semantic_meal" }
  ],
  "citations": [],
  "isStale": false,
  "staleHours": null,
  "aggregatedAt": "2026-06-03T06:00:00+09:00",
  "disclaimer": "본 답변은 추정 권장값·일반 정보이며, 의료 진단·치료·처방을 대체하지 않습니다."
}
```

**필드 설명**

| 필드 | 설명 |
|------|------|
| `today` / `week.summary` | **기록일 일평균** (`dailyAverage`). `GET /me/ai/reports/weekly`·`POST /me/ai/ask` stats와 동일 규칙 |
| `week.goalAchievement.proteinShortDays` | 기록 있는 날 중 **단백질 목표 미달** 일수 |
| `week.goalAchievement.calorieShortDays` | 기록 있는 날 중 **칼로리 목표 미달** 일수 (`lose` 목표 시 과다 섭취일은 short에 포함하지 않음 — `isGoalMet` 기준) |
| `insight.source` | 1단계는 **`template`만** (LLM 미호출) |
| `suggestedQuestions[].intentHint` | UI 칩용 힌트: `stats_query` \| `semantic_meal` \| `knowledge_query` |
| `citations` | 주간 `stat_period` + 대표 meal 0~1건 (선택적 중복 최소화) |

**집계 범위**

- `week`: anchor가 속한 **단일 KST 주(7일)** — v1.10 `GET /stats?range=week` 6버킷과 **다름**
- `today`: anchor 당일 KST 00:00~익일 00:00

**오류**

| HTTP | code | 조건 |
|------|------|------|
| 401 | `AUTH_*` | 미인증 |
| 403 | `AUTH_FORBIDDEN` | 비활성 회원 |
| 422 | `VALIDATION_FAILED` | anchor 형식·미래일 (`field: anchor`) |
| 500 | (공통) | DB·집계 실패 |
| 503 | `AI_LLM_UNAVAILABLE` | `AI_ENABLED=0` (weekly와 동일) |

**Rate limit**

- **`AI_RATE_LIMIT` 미적용** (LLM·ask와 분리된 read-only 대시보드 로드)

**빈 데이터**

- 주간 `mealCount=0`: HTTP **200**, `insight.text`에 기록 CTA, `evidenceMeals: []`, `frequentFoods: []`, `suggestedQuestions`는 기록 유도 질문 포함

## 2) 기존 엔드포인트와의 관계

| API | 관계 |
|-----|------|
| `GET /me/ai/reports/weekly` | 유지. LLM `summaryText` 필요 시 별도 호출 |
| `POST /me/ai/ask` | 유지. `suggestedQuestions[].question`을 그대로 전달 |
| `GET /stats` | coach summary가 **AI 전용 집계**를 내장; stats 6버킷 차트와 용도 분리 |

## 3) Prisma / DB

- 신규 테이블 없음. 기존 `Meal`, `Profile`, `WeightEntry` 재사용
