---
type: prd
project: dietManagement
status: approved
owner: product
parent: docs/requirements/feature-grams-only-transition-prd.md
related:
  - docs/design/mobile-log-grams-only-phase1-ux-spec.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
updated_at: 2026-08-10
approved_at: 2026-08-10
version: 0.1
tags: [requirements, prd, log, intake-unit, grams-only]
---

# Log 섭취량 표시 단위 (Option A) PRD v0.1 (approved)

> **HUMAN:** 2026-08-10 — 저장 SSOT는 `grams` 유지, UI에서만 g 외 단위로 입력·표시(안 A) 선택.  
> **PRD 승인:** 2026-08-10. 구현 착수 = **P1.3 UX 스펙 디자인 HUMAN 승인** 이후.

## 0) 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 |
| 수익 | 광고 + 후원만. 본 기능은 결제·구독과 무관 |
| 결제·정산 | 범위 없음 |

### 0.1 기존 PRD와의 관계

| 문서 | 관계 |
|---|---|
| `feature-grams-only-transition-prd` | **상위 SSOT.** Meal 저장·영양 스케일은 계속 `grams` |
| `mobile-log-grams-only-phase1-ux-spec` P1.2 | 단위 Segmented·환산 입력의 **현행 기반**. 본 PRD는 갭 보완 |
| Meal 스키마 | **`unit` / `displayQuantity` 컬럼 추가 없음**(안 B 제외) |

## 1) 목적

- 사용자가 섭취량을 **g뿐 아니라 개·접시 등 익숙한 단위로 입력**할 수 있게 한다.
- 저장·집계·영양 계산은 **항상 그램**으로 일관되게 유지한다.

## 2) 확정 결정 (대화 2026-08-10)

| ID | 항목 | 결정 |
|---|---|---|
| D-A1 | 저장 모델 | `Meal.grams`만 SSOT. 표시 단위·수량을 Meal에 별도 저장하지 않음 |
| D-A2 | UI | Log에서 단위 선택 + 수량 입력 → 내부에서 g(·매크로) 환산 후 저장 |
| D-A3 | 환산 근거 | 과거 PORTION 이력 / FoodTemplate / (갭) 사용자 입력 1단위=g |
| D-A4 | 부피(ml·컵) | **Out** (밀도 미정). 필요 시 별도 PRD |
| D-A5 | 금액 식비 | **Out** |

## 3) 현황 (베이스라인)

이미 동작하는 범위(P1.2):

1. 음식명에 **과거 PORTION_COUNT 이력** 또는 **매칭 FoodTemplate**(개/접시/공기/CUSTOM)이 있으면 단위 Segmented 노출.
2. 수량 변경 시 `servingGrams`로 g·매크로 연동.
3. 저장 payload는 `grams`(템플릿 매칭 시 목록 표시용으로 template 경로 가능).
4. 이력·템플릿이 없으면 **단위 UI 자체가 숨겨지고 g만** 보임.

## 4) 범위

### In (갭 보완 — 본 PRD 구현 단위)

1. **단위를 항상 선택 가능**하게 한다(옵션이 g뿐일 때도 「단위」진입 가능).
2. g 외 단위를 고를 때 **1단위 = N g** 를 사용자가 설정·확인할 수 있다(템플릿/이력 없을 때 필수).
3. 환산 후 저장은 기존과 동일하게 **grams + 총량 매크로**(NF draft면 g 스케일).
4. 목록 −/+: **변경 없음**(기존 g ±10 / 레거시 PORTION 규칙 유지).
5. 상태: 기본 / 환산 미입력 / g 범위 오류(1..5000) / 저장 중.

### Out

- Meal에 `displayUnit` 컬럼 추가(안 B)
- ml·oz·컵 등 부피 단위
- Admin FoodTemplate 신규 필수화
- MealSet Phase 2 변경
- 금액(원) 식비

## 5) 사용자 흐름

```
Log → 음식명 입력
  → [단위] g | 개 | 접시 | … (이력/템플릿) | (+ 기본 단위 칩)
  → 수량 입력
  → (g 외 & 환산 없음) 1단위=g 입력/확인
  → 내부 grams·매크로 갱신 → 저장(grams 필수)
```

## 6) 정책·예외

| 주제 | 정책 |
|---|---|
| SSOT | 저장·통계·NF 스케일 = `grams` only |
| 1단위 g | 1..5000. 미입력이면 g 외 단위로 저장 차단 + 안내 |
| 목록 재표시 | 템플릿 FK 없이 저장된 행은 목록에서 **Ng** (안 A). 개/접시 복원은 템플릿·레거시 PORTION만 |
| 프리셋·이전 양 | 기존 칩 유지. 탭 시 해당 단위·수량·매크로 적용 |
| API | Phase 본 범위: **계약 bump 없음**(모바일 환산 후 기존 payload) |

### 비기능·보안(라이트)

- vibe-coding-baseline 5항. 측정·성능·보안 엄격 게이트: 아니오.

## 7) 화면·디자인

- UX: [`mobile-log-grams-only-phase1-ux-spec.md`](../design/mobile-log-grams-only-phase1-ux-spec.md) **§P1.3** (67 면제).
- 디자인 HUMAN 승인 전 구현 착수 금지. 승인 시점 = 구현 착수 승인.

## 8) 수용 기준

### AC-01 저장은 항상 grams
- Given 단위=개, 수량=2, 1단위=50g
- When 저장
- Then API body `grams=100`, `foodTemplateId` 없음(템플릿 미매칭 시). Meal에 unit 컬럼 없음

### AC-02 환산 없이 g 외 저장 차단
- Given 단위=개, 수량=1, 1단위=g 미입력
- When 저장 시도
- Then 저장되지 않고 환산 입력 안내

### AC-03 이력/템플릿 단위 유지
- Given 음식명 매칭 템플릿(개, servingGrams=50)
- When 단위 Segmented에 「개」 선택·수량 2
- Then grams=100·매크로 연동(기존 P1.2와 동일)

### AC-04 g만 있을 때도 단위 진입
- Given 신규 음식명(이력·템플릿 없음)
- When 단위 UI 진입
- Then 최소 `g` 선택 가능. g 외 선택 시 1단위=g 입력 가능(AC-01·02)

### AC-05 목록 회귀
- Given 본 PRD로 저장한 g-only meal
- When 오늘 목록 −/+
- Then 기존 g ±10 규칙. PORTION 레거시 행 동작 회귀 없음

## 9) 역할·트랙

| 역할 | 담당 | 이유 |
|---|---|---|
| **frontend-agent** | 구현 Owner | Log UI·환산. API 계약 변경 없음 |
| design-system-agent | UX 스펙 P1.3 | 상태·다크모드 |
| qa-agent | AC·회귀 | P1.2·목록 stepper |
| backend-agent | 해당 없음(본 범위) | payload 기존 유지 |
| docs-agent | 인덱스·스펙 링크 | 디자인 승인 후 |

**병렬:** Gate 2 해당 없음(모바일 UI만). `parallel-delivery` 불필요.

**파일 충돌 주의:** `LogScreen.tsx`, `priorMealAmounts.ts`, `copy/log.ts`, Phase1 UX 스펙.

## 10) Gate 1 점검

| 항목 | 상태 |
|---|---|
| PRD·D·AC | **승인 2026-08-10** |
| API 계약 | bump 없음 |
| 화면/디자인 | P1.3 UX 스펙 — **디자인 승인 2026-08-10** (=구현 착수) |
| 목업 이중안 | 67 면제(스펙 §0) |

## 11) 구현 순서

1. ~~HUMAN: 본 PRD 승인~~ ✅ 2026-08-10
2. UX 스펙 P1.3 → **디자인 HUMAN**(=구현 착수)
3. `frontend-agent` 구현 → ATDD-lite RED → GREEN
4. `verify-change` / `qa-agent`

## 12) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-08-10 | 초안. 안 A 확정·P1.2 베이스라인·갭(항상 단위+1단위=g) |
| 0.1+승인 | 2026-08-10 | HUMAN PRD 승인. 구현은 P1.3 디자인 승인 후 |
| 0.1+디자인 | 2026-08-10 | P1.3 디자인 HUMAN 승인. 구현 착수 |
