---
type: prd
project: dietManagement
status: approved
owner: product
parent: docs/requirements/feature-mobile-nutrition-autofill-prd.md
related:
  - docs/requirements/feature-nutrition-food-db-prd.md
  - docs/agent/nutrition-food-db-source.md
  - docs/design/mobile-log-nutrition-autofill-ux-spec.md
updated_at: 2026-07-30
approved_at: 2026-07-30
version: 0.1
tags: [requirements, prd, nutrition-food, serving, mobile]
---

# 식약처 NF — 참고 1인분·섭취량 추천 PRD v0.1

> **HUMAN:** 채팅 「그럼 이제 진행하자」(2026-07-30) — 카피 **「참고 1인분」**, 하이브리드 A+B 채택.  
> Gate 1: 기존 NF autofill·API v1.17 연속 확장(간이). UI는 Log **슬롯 보강** → 67 면제.

## 0) 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 |
| 수익 | 광고 + 후원만. 본 기능 결제 없음 |
| 결제·정산 | 범위 외 |

## 1) 목적

식약처 `NutritionFood` 선택 후 사용자가 **섭취량(g)만** 조절하고, 매크로는 `per100g × (g/100)`로 따라가도록 하되, **참고 1인분**·**이전 섭취량**을 칩으로 빠르게 고르게 한다.

## 2) 확정 결정

| ID | 항목 | 결정 |
|---|---|---|
| D-1 | 카피 | **「참고 1인분」** (표준 아님). 출처는 기존 NF 한 줄 |
| D-2 | 데이터 | `defaultServingGrams` = 참고 g. import 시 `SERVING_WT`/`servingWt` 별칭 허용. 영양은 계속 100g SSOT |
| D-3 | 선택 시 | `grams = resolve(defaultServingGrams)` (= `?? 100`). 카탈로그에 값이 있을 때만 참고 칩 노출 |
| D-4 | 이전 양 | NF 초안 중에도 이전 칩 유지. 탭 시 **초안 유지** + g 적용 + **per100g 재환산**(과거 매크로 스냅샷 미사용) |
| D-5 | 잠금 | 참고/이전 칩 적용 시 매크로 잠금 **해제** 후 재환산 |
| D-6 | 디자인 | **67 면제**. 기존 prior 칩 패턴 재사용 |
| D-7 | API | 계약 변경 없음 (`defaultServingGrams` 기존) |

## 3) 범위

### 포함
1. import 별칭 → `defaultServingGrams`
2. Log: 참고 1인분 칩 + NF 초안×이전 양 정합
3. 출처 메모·UX 스펙 증분
4. 단위 테스트

### 제외
- 별도 표준 1인분 테이블
- Meal FK / `nutritionFoodId`
- 서버 신규 API
- 전체 MFDS 덤프 재적재(운영 import는 별도)

## 4) AC

| ID | Given-When-Then |
|---|---|
| AC-01 | Given NF에 `defaultServingGrams=210` When 선택 Then g=210·매크로 환산·「참고 1인분 210g」칩 표시 |
| AC-02 | Given 초안·g를 바꿈 When 참고 칩 탭 Then g·매크로가 참고값으로 복귀·잠금 해제 |
| AC-03 | Given 초안 ON·이전 양 150g When 이전 칩 탭 Then 초안 유지·g=150·매크로=per100g 환산 |
| AC-04 | Given `defaultServingGrams` null When 선택 Then g=100 채움·참고 칩 **없음** |
| AC-05 | Given import 행에 `SERVING_WT: 200` When parse Then `defaultServingGrams=200` |

## 5) Gate

- Gate 1: 모체 autofill PRD + 본 증분으로 충족(간이)
- Gate 2: API 변경 없음 → parallel-delivery 불필요
- 67: Log 슬롯·기존 칩 재사용
