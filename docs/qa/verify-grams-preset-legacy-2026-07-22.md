---
type: qa-verify
project: dietManagement
updated_at: 2026-07-22
related:
  - docs/requirements/feature-grams-only-transition-prd.md
  - docs/design/mobile-log-grams-only-phase1-ux-spec.md
---

# verify — grams Phase 1.1 (레거시 목록 + 1차 프리셋)

## 범위
- AC-09 목록 PORTION_COUNT 표시 (`2개` vs `100g`)
- AC-10 PORTION_COUNT ±1 (템플릿 PUT)
- AC-11 이름 매칭 프리셋
- `|| 100` 가짜 표시 제거

## 자동화
```bash
cd apps/mobile
npx --yes tsx --test src/lib/listMealQuantityDisplay.test.ts src/lib/adjustMealGrams.test.ts
```

## 수동 스모크
- [ ] 오늘 목록: 계란 `portionQuantity=2` → **2개** 표시 (100g만 아님)
- [ ] 계란 + → 3개·매크로 증가
- [ ] 수기/NF 행 → 여전히 `Ng` ±10g
- [ ] 음식명 `소주` → 「1병」칩 → 섭취량 360g
- [ ] `김·밥` → 김 1장 칩 **비표시**; `김` → 1장=2g
- [ ] 라이트/다크: 프리셋 pill·목록 단위 라벨 대비

## 결과
- 단위 테스트: **PASS** (10) — `listMealQuantityDisplay.test.ts` + `adjustMealGrams.test.ts` (2026-07-22)
- 수동: 미실행(로컬 디바이스) — APK/시뮬 확인 권장
