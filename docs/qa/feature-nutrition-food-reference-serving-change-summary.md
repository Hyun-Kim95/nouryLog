---
type: change-summary
date: 2026-07-30
area: mobile Log / NutritionFood
prd: docs/requirements/feature-nutrition-food-reference-serving-prd.md
---

# 변경 요약 — 참고 1인분·섭취량 추천

## 무엇을
- 식약처 NF 선택 시 `defaultServingGrams`가 있으면 **「참고 1인분 Ng」** 칩 표시·재적용.
- `defaultServingGrams` 없으면 g=**100** 채움, 참고 칩 없음 (AC-04).
- NF 초안 중 **이전 쓴 양** / 자주 쓰는 양 탭 시 초안 유지 + **per100g 재환산** (과거 매크로 스냅샷 미사용).
- import: `SERVING_WT` / `servingWt` → `defaultServingGrams`.

## 영향
- 모바일 LogScreen, `nutritionFoodScale`, `nutritionFoodImport`, copy, 출처/디자인 문서.
- API 계약 변경 없음.

## 확인
- [ ] NF(기본 g 있음) 선택 → g·매크로 채움 + 참고 칩
- [ ] g 변경 후 참고 칩 → 복귀·잠금 해제
- [ ] 이전 양 칩 → 초안 유지·매크로 환산
- [ ] 단위: import·scale 테스트 pass

## 후속
- 운영 덤프 재import 시 SERVING_WT 매핑으로 `defaultServingGrams` 채우기
- qa-agent 독립 verify 문서(Gate 3 정식)는 요청 시
