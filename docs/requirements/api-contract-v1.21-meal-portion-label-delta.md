---
type: api-contract
project: dietManagement
status: fixed
updated_at: 2026-08-17
version: v1.21
tags: [requirements, api-contract, meal, portion-label]
related:
  - docs/requirements/feature-log-intake-display-unit-prd.md
  - docs/design/mobile-log-grams-only-phase1-ux-spec.md
---

# API 계약 v1.21 — 수기 Meal `portionLabel` 스냅샷

신규 음식도 개/접시 등으로 저장하면 목록에서 `N개` 표시·±1 단위가 되도록, **표시용 스냅샷**을 Meal에 둔다. 영양·집계 SSOT는 계속 `grams`.

OpenAPI: `contracts/openapi-diet-management-v1.yaml` `Meal` / `MealInput` / `MealEntrySuggestionMeal`.

## 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 |
| 수익 | 광고 + 후원만. 본 변경은 결제·구독과 무관 |
| 결제·정산 | 범위 없음 |

## 변경

### `Meal.portionLabel` (nullable string, max 20)

수기 `PORTION_COUNT`(템플릿 없음)일 때 표시 단위(개/접시/병 등). 템플릿 경로에서는 `null`(라벨은 FoodTemplate).

### 수기 `POST`/`PUT` (`foodTemplateId` 없음 또는 `null`)

| `mealInputMode` | 필수 | 저장 |
|---|---|---|
| `TOTAL_GRAMS` 또는 생략 | — | `portionQuantity`/`portionLabel` = null |
| `PORTION_COUNT` | `portionQuantity`(0.1~50) + `portionLabel`(1~20자) | 스냅샷 저장. `grams`는 클라이언트가 보낸 총량(SSOT) |

템플릿 `PORTION_COUNT` 규칙은 기존과 동일(서버가 grams·매크로 재계산, `portionLabel`은 null).

### 응답

- `GET /meals` 항목에 `portionLabel`
- `GET /me/meal-entry-suggestions` `MealEntrySuggestionMeal`에 `portionLabel`

후방 호환: 신규 필드. 구 클라이언트는 무시 가능.

### 소비자

| 클라이언트 | 동작 |
|---|---|
| 모바일 Log 저장 | 단위≠g 이고 템플릿 미매칭이면 `PORTION_COUNT` + 수량 + 라벨 |
| 모바일 Log 목록 −/+ | 스냅샷 있으면 `N{단위}`·±1. PUT 시 수량·라벨 유지(grams 스케일) |
