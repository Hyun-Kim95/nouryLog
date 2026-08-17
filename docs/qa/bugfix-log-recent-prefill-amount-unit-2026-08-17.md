---
type: bugfix-note
date: 2026-08-17
area: mobile Log / recent meal prefill
---

# Log 최근 기록 불러오기 — 섭취량·단위 미채움

## 증상 / 기대
- 증상: 음식명 제안·최근 칩 탭 시 이름·매크로만 채워지고 섭취량·단위는 빈 칸(또는 기본 `g`).
- 기대: 해당 기록의 섭취량과 단위까지 입력란에 채움.

## 원인
- 제안 API `MealEntrySuggestionMeal`에 `grams`가 없음.
- `applyManualFromMeal`은 `resolvedEditableGrams`가 null이면 섭취량을 비움(매크로만 복사).

## 수정
- 제안 응답에 `grams` 추가(v1.20).
- `mealIntakePrefill`: g 기록은 수량+`g`, PORTION+템플릿은 개수+단위(grams 없어도 servingGrams로 환산).
- 구서버 폴백: 로컬 식사 목록에서 동일 `mealId`로 grams 보강.
- 불러온 PORTION 단위가 Segmented에서 사라지지 않도록 해당 meal을 단위 옵션 소스에 포함.

## 한계 (D-A1)
- 구버전으로 **g만** 저장한 행은 스냅샷이 없음 → 불러오면 g. 같은 이름 템플릿 배수면 목록에서 N개로 추론 가능.
- v1.21 이후 개/접시 저장은 `portionLabel` 스냅샷으로 목록·불러오기 모두 단위 유지.

## 검증
- `apps/mobile` `mealIntakePrefill.test.ts`
- `apps/server` `mealEntrySuggestions.test.ts`
