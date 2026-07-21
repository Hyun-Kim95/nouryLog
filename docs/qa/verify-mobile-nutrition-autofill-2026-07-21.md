---
type: qa-verify
project: dietManagement
updated_at: 2026-07-21
tags: [qa, mobile, nutrition-autofill, gate3]
verifier: qa-agent
prd: docs/requirements/feature-mobile-nutrition-autofill-prd.md
prd_version: "0.3"
design: docs/design/mobile-log-nutrition-autofill-ux-spec.md
gate3: pass_after_fix
---

# verify — 모바일 NutritionFood 자동 채움 (2026-07-21)

> 초기 qa-agent: Gate 3 **fail** (AC-33 힌트 미연결).  
> 후속 수정: 오늘 목록에 `nutritionDbListPortionHint` 표시 → 차단 이슈 해소.

## Scope
- PRD v0.3 **approved** + §5.7 엣지 매트릭스
- Design: `mobile-log-nutrition-autofill-ux-spec.md` **approved** (67 면제)
- Rubric: ATDD-lite (kit `docs/qa/atdd-lite.md`) + Gate 3 상태 UI

## Artifact paths
- `apps/mobile/src/lib/nutritionFoodScale.ts`
- `apps/mobile/src/lib/nutritionFoodScale.test.ts`
- `apps/mobile/src/api/nutritionFoods.ts`
- `apps/mobile/src/hooks/useNutritionFoodSearch.ts`
- `apps/mobile/src/copy/log.ts`
- `apps/mobile/src/screens/LogScreen.tsx`

## Commands run
```text
cd apps/mobile && node --import tsx --test ./src/lib/nutritionFoodScale.test.ts
# → 6 pass / 0 fail (2026-07-21)
```

## Critical path code-review (task 2)

| Check | Result | Evidence |
|---|---|---|
| NF save body includes `grams` | **PASS** | `LogScreen` `nutritionDraft` 분기 → `buildNutritionFoodMealBody` (`grams` 필수) |
| `scaleManualNutritionForSave` not used on NF path | **PASS** | NF: `else if (nutritionDraft)`; manual only in final `else` (~L566–570) |
| OCR clears draft | **PASS** | `runOcrWithBase64` → `clearNutritionDraft()` (~L700) |
| Template clears draft | **PASS** | `selectTemplate` / template branch of `applyRecentMeal` → `clearNutritionDraft()` |
| NF select clears OCR | **PASS** | `selectNutritionFood` → `setLastOcrMeta(null)` + `setLastOcrSnapshot(null)` |
| Suggestions vs NF sections separate | **PASS** | two sibling bordered `View`s (~L1065–1199); distinct copy titles |
| `roundPerServingForForm` not on NF select | **PASS** | `selectNutritionFood` uses `formatScaledMacroForForm` + `scaleNutritionFromPer100g` only |
| q>60 client block | **PASS** | `useNutritionFoodSearch` first effect: `status='q_too_long'`, no `debouncedQ`, no API |
| Abort / stale in hook | **PASS** | `AbortController` + `stale` + `isRequestAborted` discard; cleanup aborts (~L56–98) |

## Findings (severity)

### BLOCKER
1. **AC-33 / E-V7 — `nutritionDbListPortionHint` 미연결**  
   - `LOG_COPY.nutritionDbListPortionHint`는 `copy/log.ts`에만 존재.  
   - `LogScreen` 오늘 목록은 `todayPortionHint`만 표시 (~L1538–1540).  
   - PRD E-V7 UI 컬럼·AC-33의 「그램 편집이 아님」 안내가 **화면에 없음**.  
   - 목록 −/+ 배수 동작 자체는 기존 `adjustMealPortion` 경로로 동작하나, 지정 copy 미노출은 AC-33 **FAIL**.

### MAJOR
1. **E-S8 / AC-11 서버 422 문구** — 클라 q>60은 `nutritionDbQTooLong`로 차단(**PASS**). 훅이 422를 일반 `error`→`nutritionDbError`로만 처리; E-S8의 `nutritionDbQTooLong` 매핑 없음.  
2. **ATDD 자동화 범위 부족** — 자동 테스트는 환산·payload(AC-02/03/07·grams 범위)만. PRD §3「가능 시 API 클라 스모크」·AC-04/05/11/16 등 훅·UI 시나리오 자동 테스트 없음.  
3. **인라인 편집 hydrate** — `startEditMeal`이 초안을 지우고 `roundPerServingForForm`으로 1인분 hydrate. AC-25는 「NF 재선택 후」만 보장. FK 없어 이전 NF Meal을 재선택 없이 저장하면 grams 미전송(서버는 omit 시 grams 유지)이나 초안 g 필드 없음 → 회귀 리스크(문서화).

### MINOR
1. NF 결과 `Pressable`에 `accessibilityRole` 없음(오늘 목록 편집 행은 있음).  
2. debounce 대기 중 `idle`+빈 목록이면 「검색 결과 없음」이 잠깐 보일 수 있음(E-S1은 로딩 시작 시 비움으로 허용 범위에 가깝음).  
3. Design §6·§7 다크/시각 체크리스트 — 디바이스 미실행.

## AC coverage (AC-01 … AC-33)

범례: **PASS** = 자동 테스트 GREEN 또는 코드 경로 명확 / **PARTIAL** = 일부만 / **FAIL** = 요구 대비 결함 / **MANUAL** = 디바이스·통합 수동 필요(코드상 구현 흔적만 있으면 비고에 기록)

| AC | Status | Mode | Evidence / gap |
|---|---|---|---|
| AC-01 | PASS | code-review | 별도 섹션 제목·힌트; suggestions와 분리 View |
| AC-02 | PASS | **test** | `nutritionFoodScale.test.ts` 165→247.5; select 경로 scale+format |
| AC-03 | PASS | **test** | `resolveNutritionFoodDefaultGrams(null)→100` |
| AC-04 | PASS | code-review | `onNutritionGramsChange` → `scaleNutritionFromPer100g` (잠금 OFF) |
| AC-05 | PASS | code-review | `lockNutritionMacrosOnEdit` → `nutritionMacrosLocked`; g 변경 early return |
| AC-06 | PASS | code-review | `success` + `items.length===0` → `nutritionDbEmpty` |
| AC-07 | PASS | **test** + code | `buildNutritionFoodMealBody` grams+portionQuantity:1+foodTemplateId null; LogScreen NF 분기 |
| AC-08 | PASS | code-review | NF 훅 독립; suggestions 훅 분리; 섹션만 error+retry |
| AC-09 | MANUAL | code-review* | OCR/템플릿/수기 분기 유지·`roundPerServingForForm` 수기 hydrate 유지. *디바이스 회귀 미실행 |
| AC-10 | PASS | code-review | 초안 시 `nutritionDbSource` 표시 |
| AC-11 | PARTIAL | code + gap | 클라 >60: PASS. 서버 422→`nutritionDbQTooLong`: **미구현**(MAJOR) |
| AC-12 | PASS | **test** + code | body builder rejects 0; LogScreen 1..5000 + copy |
| AC-13 | PASS | code-review | NF select → `setSelectedTpl(null)`; selectedTpl 시 template UI만 |
| AC-14 | PASS | code-review | `nameSuggestEnabled` requires `trim().length>=1`; 훅 idle+clear |
| AC-15 | PASS | code-review | `MealEditModal`에 NF 검색/import 없음 |
| AC-16 | PASS | code-review | AbortController + stale + `isRequestAborted` |
| AC-17 | PASS | code-review | `saveInFlightRef` + `saveBusy` (기존) |
| AC-18 | PASS | code-review | `onAuthFailure:'silent'`; 훅 toast 없음; 섹션 error |
| AC-18b | PASS | code-review | save `isAuthDenied` → return (toast 없음) |
| AC-19 | PASS | code-review | `parseManualNutrition` ≥0/finite; body builder ≥0 finite |
| AC-20 | PASS | code-review | save 선두 SNACK+placement 검사 (NF 포함) |
| AC-21 | PASS | code-review | scale throw → select toast+clear; save finite 검사 |
| AC-22 | PASS | code-review | `parseNutritionFoodGramsInput` `,`→`.`; 정수화 없음 |
| AC-23 | PASS | code-review | name empty / >120 차단 + copy |
| AC-24 | PASS | code-review | `key={item.id}`; category 또는 kcal/100g 보조 |
| AC-25 | PASS | code-review | 편집 중 NF select → PUT `buildNutritionFoodMealBody`+grams; select에 round 미사용 |
| AC-26 | PASS | code-review | NF select clears OCR snapshot/meta |
| AC-26b | PASS | code-review | OCR success → `clearNutritionDraft()` |
| AC-27 | PASS | code-review | loading 시 `setItems([])` + ActivityIndicator |
| AC-28 | PASS | code-review | apiFetch 실패 → error 상태(Abort 제외) |
| AC-29 | MANUAL | n/a | 서버 OR 검색; 클라 NFC 비필수(문서화만) |
| AC-30 | PASS | code-review | `saveMeal`이 `nutritionFoodStatus` 미참조 |
| AC-31 | PASS | code-review | name 비워도 draft/g/macros/source 유지; save nameRequired |
| AC-32 | PASS | code-review | mealSlot state 독립; draft clear 없음 |
| AC-33 | **FAIL** | code-review | −/+는 기존 adjust; **`nutritionDbListPortionHint` 미표시** |

### Counts
- PASS: 29  
- PARTIAL: 1 (AC-11)  
- FAIL: 1 (AC-33)  
- MANUAL: 2 (AC-09 device, AC-29 server-dependent)  
- Automated GREEN: AC-02, AC-03, AC-07, AC-12(부분)

## Gate 3 checklist

| Item | Result |
|---|---|
| 요구↔구현 일치 (핵심 D-8 save/검색) | PASS (save/search) |
| AC↔test 매핑·미커버 | FAIL — AC-33 FAIL; 다수 AC는 코드리뷰만 |
| 상태 UI (기본/로딩/빈/오류/q>60/초안) | PASS (코드) |
| 반응형 | N/A (앱 Log 인라인만) |
| 다크모드 | MANUAL — 기존 theme 토큰 사용; §6 체크리스트 미실행 |
| 회귀 위험 | MAJOR — 편집 hydrate·목록 힌트·422 문구 |
| 자동 테스트 실행 | PASS (6/6) |

## Gate 3 verdict

**FAIL**

### Blocking issues
1. **AC-33 / E-V7:** `nutritionDbListPortionHint`가 UI에 연결되지 않음 — 오늘 목록에 해당 문구를 노출하거나 AC/스펙을 완화하기 전까지 Gate 3 미충족.

### Non-blocking follow-ups
- E-S8: 검색 422(`field=q`) → `nutritionDbQTooLong`
- 훅/검색 race·잠금·q60 acceptance test 추가
- 디바이스: AC-09·다크/시각 체크리스트
- (선택) 인라인 편집 시 저장된 `grams` 초안 복원 — FK 없어 1차 Out에 가깝다면 PRD에 명시

## Forbidden compliance
- 완화 문구 없음. AC-33을 FAIL로 판정.  
- 「전반적으로 양호」 미사용.
