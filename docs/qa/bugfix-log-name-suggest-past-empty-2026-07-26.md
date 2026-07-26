---
type: bugfix-note
date: 2026-07-26
area: mobile Log / meal-entry-suggestions
---

# Log 음식명 제안 — 과거 기록 있는데 빈 상태

## 증상 / 기대
- 증상: 과거 Meal이 있는데 「일치하는 템플릿·과거 기록이 없어요」가 뜸.
- 기대: D-9에 따라 이름 일치 과거 기록이 제안으로 노출.

## 원인
- Log는 API 결과에서 `past_meal`만 표시(D-9).
- 서버는 템플릿 우선 병합·동명 past 제거 → 템플릿만 오면 클라이언트가 빈 목록으로 처리.
- 폴백 `recentMeals`는 `excludeFoodTemplate` + 최근 소수라 보완 불가한 경우가 많음.

## 수정
- API `sources=past_meal`(v1.18): 템플릿 없이 과거 Meal만.
- Log `useMealEntrySuggestions(..., { sources: 'past_meal' })`.
- copy: 과거 기록만 안내하는 문구로 정리.

## 검증
- `mealEntrySuggestions` 단위 테스트(parse sources + past-only merge).
- MealSet/FoodSearch는 `sources` 미전달(기존 혼합).

## 잔여
- 이름에 부분일치하지 않는 과거 기록은 여전히 빈 상태(정상).

## 2026-07-26 재발 (폰 APK)
- 프로덕션 API `contract: v1.7.0` — `sources`/`servingGrams` 서버 미배포.
- 클라 보강: 제안 폴백을 `amountHistoryMeals`로 확대·병합; OCR은 `rawText`에서 g 파싱(구서버에서도 동작).
- **서버 배포(커밋·푸시→Railway) 필요**해야 API past_meal-only·servingGrams 필드가 살아남.
