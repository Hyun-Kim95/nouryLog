---
type: api-contract
project: dietManagement
status: fixed
updated_at: 2026-07-26
version: v1.18
tags: [requirements, api-contract, meal-entry-suggestions, grams-only]
related:
  - docs/requirements/feature-grams-only-transition-prd.md
  - docs/requirements/api-contract-v1.5-delta.md
---

# API 계약 v1.18 — meal-entry-suggestions `sources`

PRD: [`feature-grams-only-transition-prd.md`](./feature-grams-only-transition-prd.md) D-9 (Log 음식명 제안 = 과거 기록만).

OpenAPI: `contracts/openapi-diet-management-v1.yaml` `/me/meal-entry-suggestions`.

## 변경: `GET /me/meal-entry-suggestions`

### 신규 쿼리 파라미터
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sources` | string enum | 선택 | `all`(기본) · `past_meal` |

| 값 | 동작 |
|---|---|
| 미전달 / `all` | 기존과 동일: 활성 템플릿 + 사용자 활성 식사, 템플릿 우선·이름 중복 제거 |
| `past_meal` | 사용자 활성 식사만(이름 contains). 템플릿 조회·템플릿과의 이름 중복 제거 없음 |

- 잘못된 값 → `422` `VALIDATION_FAILED`, `details.field=sources`
- 응답 스키마 변경 없음 (`MealEntrySuggestionsResponse`)
- 후방 호환: `sources` 미전달 시 v1.5와 동일

### 소비자
| 클라이언트 | `sources` |
|---|---|
| 모바일 Log 음식명 제안 | `past_meal` |
| MealSet 통합 검색·FoodSearch 자동완성 등 | 미전달(`all`) |
