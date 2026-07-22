---
type: prd
project: dietManagement
status: approved
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/requirements/feature-mobile-nutrition-autofill-prd.md
  - docs/requirements/feature-nutrition-food-db-prd.md
  - docs/requirements/feature-mobile-meal-set-prd.md
  - docs/requirements/mobile-log-ux-improvements-prd.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
  - docs/design/mobile-log-nutrition-autofill-ux-spec.md
  - docs/design/mobile-log-grams-only-phase1-ux-spec.md
updated_at: 2026-07-22
approved_at: 2026-07-21
version: 0.2
tags: [requirements, prd, grams-only, food-template, migration]
---

# g-only 전환 (FoodTemplate 단계적 폐기) PRD v0.2 (approved)

> **HUMAN 승인:** 2026-07-21 — D-1~D-9( D-3 = 목록 −/+ **g 증감** 포함).  
> **Phase 1.1 (2026-07-22):** 레거시 PORTION_COUNT 목록 표시·±1 단위 + 1차 g 프리셋 In.  
> Phase 1 구현 착수 = **디자인 스펙 HUMAN 승인 후**. Phase 2·3는 별도 착수.  
> 방향: 식약처 `NutritionFood` + **섭취 g**가 기본 입력. FoodTemplate·인분 모델은 단계적으로 퇴역.

## 0) 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 |
| 수익 | 광고 + 후원만. 본 전환은 결제·구독과 무관 |
| 결제·정산 | 범위 없음 |

### 0.1 기존 PRD와의 관계 (충돌 시)

| 문서 | 기존 | 본 PRD |
|---|---|---|
| nutrition-autofill v0.3 | 템플릿·수기(1인분) **병행** | Phase 1부터 Log **신규 입력은 g-only**. autofill을 **기본 경로**로 승격. 병행 가정 폐기(D-8) |
| mobile-log-ux | 템플릿 칩·분량 UI 필수 | Phase 1에서 칩·분량 UI **숨김**. 스펙 개정 |
| meal-set | MVP = FoodTemplate + PORTION_COUNT | **Phase 2**에서 manual-g로 전환. Phase 1은 MealSet 유지 |
| nutrition-food-db | Meal/FoodTemplate 불변 | Phase 1~2 스키마 유지. **Phase 3**에서 FoodTemplate 정리 |
| 모체 앱 PRD | Admin 음식 템플릿 핵심 | Phase 3까지 Admin 동결(D-7) |

## 1) 목적

- 영양 기록의 기준을 **섭취 그램(g)** 한 가지로 통일한다.
- 공개 카탈로그(`NutritionFood`) + 수기 g가 주 경로가 되게 한다.
- FoodTemplate·인분 배수를 **한 번에 삭제하지 않고** 단계적으로 폐기한다.

## 2) 확정 결정 (HUMAN 2026-07-21)

| ID | 항목 | 결정 |
|---|---|---|
| D-1 | Phase 1 API | 서버는 `foodTemplateId` **계속 수용**. 신규 모바일만 미전송 |
| D-2 | 순수 수기 Log | **g + 총량 매크로**. 1인분 폼·`scaleManualNutritionForSave` 신규 경로 제거 |
| D-3 | 목록 −/+ | 기본 **g ±10**. Phase 1.1: 레거시 `PORTION_COUNT`+템플릿은 **표시·±1 단위**(저장 grams 유지) |
| D-10 | 프리셋 (P1.1) | 음식명 매칭 시 개/병/장 → **고정 g** 칩. 저장은 수기 g. Railway 상위 빈도 1차만 |
| D-4 | MealSet (P2) | manual 스냅샷(name+g+매크로). 편집 시 NF 채움 허용 |
| D-5 | 기존 MealSet 템플릿 | apply 시 스냅샷 펼침 + 편집에서 manual 유도. 강제 삭제 없음 |
| D-6 | 기존 Meal FK | Phase 3 전까지 유지. 편집은 g 스냅샷 우선 |
| D-7 | Admin Foods | Phase 1~2 **동결**(신규 비권장). 삭제는 Phase 3 |
| D-8 | autofill | Phase 1이 「템플릿 병행」을 **대체** |
| D-9 | suggestions template | Phase 1 **유지**. Phase 3 제거 |

## 3) 단계 범위

### Phase 1 — Log 입력 g-only (1차 구현 단위)

**포함**
1. Log: 템플릿 칩·PORTION_COUNT/TOTAL_GRAMS·tpl 분량 UI **숨김**
2. 신규/인라인 저장: **grams 필수** + 총량 매크로 (NF·순수 수기 통일)
3. 1인분 힌트 → g 안내 copy
4. OCR 성공 후: 매크로 채움 + **grams 기본 100**(총량으로 해석). 사용자가 g 수정
5. 목록 −/+: **g ±10** (AC-07)
6. 디자인 스펙 Phase 1 + AC

**제외 (Phase 1)**
- MealSet UI/계약 변경
- FoodTemplate 테이블·Admin CRUD 삭제
- `POST /meals`에서 `foodTemplateId` 거절
- 목록 stepper **제거**(동작만 g로 변경)

### Phase 2 — MealSet g 스냅샷
### Phase 3 — 스키마·Admin 정리

(상세는 draft와 동일 — 별도 착수 승인)

## 4) 사용자 흐름 (Phase 1)

```
Log → 템플릿 칩 없음
  → 음식명: suggestions(과거·template kind 유지) + 영양 DB
  → g + 총량 매크로 → 저장(grams 필수)
  → OCR: 매크로 + g=100 기본
목록 −/+: 기본 g ±10 "150g"; PORTION_COUNT 레거시 "2개" ±1
폼: 섭취량(g) 아래 이름 매칭 프리셋(계란 1개=50g 등)
```

### Phase 1.1 — 레거시 목록 + 1차 프리셋

**포함**
1. 목록: `PORTION_COUNT`+템플릿+`portionQuantity` → **`N{단위}`** 표시, −/+ **±1 단위** (`newGrams = qty × servingGrams`, 템플릿 PUT 또는 동등 스케일)
2. 그 외 목록: `Ng` + ±10g (Phase 1), `|| 100` 가짜 표시 제거
3. 폼: 섭취량(g) 아래 **이름 매칭 프리셋** (계란/소주/맥주/김/바나나/라면류)
4. DB 일괄 보정·Meal API portionUnit 필드 **Out**

## 5) 정책·예외

| 주제 | 정책 |
|---|---|
| 신규 Meal | `foodTemplateId` 없음, `grams` 1..5000, 매크로 총량 |
| 구앱 | 템플릿 POST 수용(D-1) |
| 목록 −/+ | 기본 `grams ± 10`; PORTION_COUNT 레거시 `portionQuantity ± 1` → grams·매크로 갱신 |
| MealSet | Phase 1 기존 유지 |
| 프리셋 | **Phase 1.1 In** — 라벨→고정 g, 저장 수기 g. 김치·치킨 접시/인분 2차 Out |

### 비기능·보안(라이트)
- vibe-coding-baseline 5항. 측정·성능·보안 엄격 게이트: 아니오.

## 6) API

Phase 1: 계약 bump 최소. 모바일 g payload. 서버 템플릿 분기 유지.  
**Gate 2 parallel-delivery:** Phase 1 해당 없음(모바일+문서).

## 7) 화면·디자인

Phase 1·1.1: 67 면제 — [`mobile-log-grams-only-phase1-ux-spec.md`](../design/mobile-log-grams-only-phase1-ux-spec.md) (**approved**).

## 8) 수용 기준 (Phase 1)

### AC-01 템플릿 칩 비표시
### AC-02 신규 수기 grams 필수·foodTemplateId 없음
### AC-03 NF 경로 유지(§6.1)
### AC-04 1인분 힌트 없음·g 안내
### AC-05 구 API foodTemplateId 수용
### AC-06 MealSet 회귀
### AC-07 목록 −/+ g ±10·매크로 비율
### AC-07b g 클램프 1..5000
### AC-08 OCR 후 grams 기본 100

### AC-09 (P1.1) 목록 PORTION_COUNT 표시
- Given 계란 템플릿 meal `portionQuantity=2`, `grams=100`
- When 오늘/과거 목록
- Then 표시는 `2개` (100g로만 보이지 않음)

### AC-10 (P1.1) 목록 PORTION_COUNT ±1
- Given AC-09 행
- When +
- Then `portionQuantity=3`, `grams=150`(×servingGrams), 매크로 갱신·템플릿 연동 유지

### AC-11 (P1.1) 프리셋 칩
- Given 음식명에 `소주` 포함
- When 「1병」 칩 탭
- Then 섭취량(g)=360. NF draft면 잠금 전 매크로 재환산

## 9) 역할·트랙

| 역할 | Phase 1 |
|---|---|
| **frontend-agent** (Owner) | Log·stepper·copy |
| design-system-agent | 스펙 |
| qa-agent | AC·회귀 |
| backend-agent | P1 해당 없음 |
| docs-agent | autofill supersede·인덱스 |

## 10) Gate 1

| 항목 | 상태 |
|---|---|
| PRD·D·AC | **승인 2026-07-21** |
| API | P1 기호환 |
| 화면/디자인 | Phase 1 스펙 — **HUMAN 승인 2026-07-21** (=구현 착수) |
| 미확정 | 없음 |

## 11) 구현 순서

1. ~~D-1~D-9~~ ✅  
2. 디자인 스펙 승인  
3. Phase 1 구현 → verify  
4. Phase 2·3 별도 승인

## 12) 후속

nutritionFoodId, 카탈로그 확대, 김치·치킨 등 2차 프리셋, Phase 2·3.

## 13) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-21 | 초안 |
| 0.1a | 2026-07-21 | D-3 g 증감 |
| 0.1+승인 | 2026-07-21 | HUMAN 승인. OCR g=100 확정 |
| 0.1+디자인 | 2026-07-21 | Phase 1 디자인 승인·구현 |
| 0.2 | 2026-07-22 | Phase 1.1: 레거시 목록 표시·±1 + 1차 프리셋(D-10)·AC-09~11 |
