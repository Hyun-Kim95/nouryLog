---
type: api-contract
project: dietManagement
status: fixed
updated_at: 2026-08-17
version: v1.20
tags: [requirements, api-contract, meal-entry-suggestions, grams-only]
related:
  - docs/requirements/api-contract-v1.18-meal-entry-suggestions-sources-delta.md
  - docs/design/mobile-log-grams-only-phase1-ux-spec.md
---

# API 계약 v1.20 — meal-entry-suggestions `grams`

Log에서 과거 기록 제안/최근 칩을 탭하면 **섭취량·단위**까지 입력란에 채운다.

OpenAPI: `contracts/openapi-diet-management-v1.yaml` `MealEntrySuggestionMeal`.

## 변경: `GET /me/meal-entry-suggestions` 응답

### 신규 필드 (`MealEntrySuggestionMeal`)
| 필드 | 타입 | 설명 |
|---|---|---|
| `grams` | `number \| null` | 해당 식사 총 그램. 저장 SSOT와 동일 |

- `foodTemplateId` / `mealInputMode` / `portionQuantity`는 기존 유지(PORTION 단위 복원용).
- 후방 호환: 신규 필드. 구 클라이언트는 무시 가능.

### 소비자
| 클라이언트 | 동작 |
|---|---|
| 모바일 Log 음식명 제안·최근 칩 | `grams`(+ PORTION 필드)로 섭취량·단위 프리필. 구서버면 로컬 식사 목록에서 동일 `mealId` 폴백 |
