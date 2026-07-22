---
type: qa-verify
project: dietManagement
updated_at: 2026-07-21
tags: [qa, mobile, grams-only, phase1]
prd: docs/requirements/feature-grams-only-transition-prd.md
---

# verify — g-only Phase 1 (2026-07-21)

## Scope
PRD Phase 1 + design `mobile-log-grams-only-phase1-ux-spec.md` approved.

## Automated
```text
cd apps/mobile
node --import tsx --test ./src/lib/adjustMealGrams.test.ts ./src/lib/nutritionFoodScale.test.ts
# 8 pass / 0 fail
```

## Code evidence (manual AC)
| AC | Status | Note |
|---|---|---|
| AC-01 템플릿 칩 숨김 | PASS | `{templateChips}` 제거 |
| AC-02 grams 필수 저장 | PASS | `saveMeal` → `buildNutritionFoodMealBody` |
| AC-03 NF 경로 | PASS | 검색·초안 유지 |
| AC-04 g 안내 | PASS | `manualPerServingHint` 문구 변경 + g 필드 상시 |
| AC-07 ±10g | PASS | `MealPortionStepper` + `adjustMealGramsOnServer` |
| AC-08 OCR g=100 | PASS | `runOcrWithBase64` |

## Residual
- MealEditModal 미변경(Phase 1 범위)
- MealSet 템플릿 유지(Phase 2)
- grams 없는 레거시 행은 stepper 숨김(`canAdjustPortionInList`)
