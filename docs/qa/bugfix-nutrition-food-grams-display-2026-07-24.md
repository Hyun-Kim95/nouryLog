---
type: bugfix-note
date: 2026-07-24
area: mobile Log / NutritionFood (식약처)
---

# 식약처 DB 저장 후 섭취량(g) 미표시

## 증상 / 기대
- 증상: 식약처(NutritionFood) 선택·저장 후 오늘 목록·수정 폼에서 섭취량이 빠진 것처럼 보임(특히 기본 100g).
- 기대: 저장한 grams가 목록에 `Ng`로 보이고, 수정 시 필드에 채워짐.

## 원인
- API/DB에는 grams가 저장됨.
- UI `isLikelyUnsetManualGrams`가 `grams≈100`(+ 레거시 `portionQuantity=1`)을 「미입력」으로 가림.
- NF 저장 빌더가 `portionQuantity: 1`을내어 레거시 미입력 지문과 충돌.

## 수정
- `unsetManualGrams`: 누락/무효 grams만 unset.
- `buildNutritionFoodMealBody`: `mealInputMode: TOTAL_GRAMS`, `portionQuantity: null`.
- 서버 수기 POST/PUT: 클라이언트가 보낸 `TOTAL_GRAMS` 저장.

## 검증
- 단위 테스트: `unsetManualGrams` / `nutritionFoodScale` / `listMealQuantityDisplay` 23 pass.
- 서버 `tsc --noEmit` pass.

## 잔여
- 예전에 grams 생략으로 서버 기본 100이 들어간 행도 이제 100g로 보일 수 있음(의도적 100g와 구분 불가).
- UX 스펙 0.6「수기 기본100g=미입력」과 정책 충돌 — 이번 픽스가 우선.
