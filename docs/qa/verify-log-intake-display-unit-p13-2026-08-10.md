---
type: verify
project: dietManagement
slug: log-intake-display-unit-p13
date: 2026-08-10
prd: docs/requirements/feature-log-intake-display-unit-prd.md
status: pass
blocker_count: 0
---

# verify — Log 섭취량 표시 단위 P1.3 (2026-08-10)

## 범위

PRD Option A / P1.3: 저장 `grams` SSOT, UI 단위 항상 노출, 미환산 시 1단위=g.

## AC 매핑

| AC | 결과 | 근거 |
|---|---|---|
| AC-01 저장 grams | PASS (단위 테스트) | `withServingGrams` + `gramsFromIntakeAmount` → 2×50=100. 템플릿 없으면 manual path (`portionTemplateMissing` 제거) |
| AC-02 환산 미입력 차단 | PASS (코드 점검) | `intakeUnitNeedsServingGrams` + `servingGramsPerUnitRequired` |
| AC-03 이력/템플릿 유지 | PASS | 기존 템플릿 `개` 옵션·매크로 테스트 유지 |
| AC-04 단위 항상 진입 | PASS | `intakeUnitOptionsForName` 기본 칩 + Segmented 항상 표시 |
| AC-05 목록 회귀 | PASS | `listMealQuantityDisplay` / `adjustMealGrams` 회귀 통과 |

## 자동화

```text
cd apps/mobile
npx tsx --test src/lib/priorMealAmounts.test.ts src/lib/listMealQuantityDisplay.test.ts src/lib/adjustMealGrams.test.ts
# 21 pass, 0 fail
```

## BLOCKER

없음 (0).

## 잔여 리스크 / manual

- 기기에서 Segmented 6칩(g+기본 단위) 좁은 화면 가독성 — **manual**
- Log E2E 저장 경로(템플릿 없는 개×g) — **manual** 스모크 권장

## 판정

Gate 3 본 범위: **BLOCKER 0**. 출시 전 기기 스모크만 권장.
