---
type: design-spec
project: dietManagement
status: approved
updated_at: 2026-08-10
approved_at: 2026-07-21
phase_1_1_approved_at: 2026-07-22
phase_1_3_status: approved
phase_1_3_approved_at: 2026-08-10
parent_prd: docs/requirements/feature-grams-only-transition-prd.md
parent_prd_p13: docs/requirements/feature-log-intake-display-unit-prd.md
parent_design: docs/design/mobile-log-input-ux-spec.md
related:
  - docs/design/mobile-log-nutrition-autofill-ux-spec.md
---

# 모바일 Log — g-only Phase 1 / 1.1 / P1.3 UX 스펙 (67 면제)

> PRD: [`feature-grams-only-transition-prd.md`](../requirements/feature-grams-only-transition-prd.md) **approved**.  
> P1.3 PRD: [`feature-log-intake-display-unit-prd.md`](../requirements/feature-log-intake-display-unit-prd.md) **approved** (2026-08-10).  
> **HUMAN 디자인 승인:** Phase 1 = 2026-07-21. Phase 1.1 = 2026-07-22.  
> **P1.3 디자인 HUMAN 승인:** 2026-08-10 (= 구현 착수).

## 0) 67 면제

| 항목 | 내용 |
|---|---|
| 스코프 | Phase 1~1.1: 기존. **P1.3:** 기존 Log 폼 슬롯 보강(단위 항상 노출 + 1단위=g 필드 0~1개). 신규 라우트 0 |
| SSOT | `mobile-log-input-ux-spec` + autofill 스펙 + 본 문서 + P1.3 PRD |
| 재사용 | `LabeledField`, `Segmented`, `MealPortionStepper`, recentMeals Pressable pill, `theme.tsx` |
| 이중안 | **면제**(기존 화면 슬롯 1~2개 + 정착 컴포넌트 재사용) |
| 다크모드 | 기존 토큰만 |

## 1) 섹션 순서 (Log)

1. OCR / 사진 분석  
2. ~~템플릿 칩~~ **Phase 1 숨김**  
3. 최근 먹은 음식 (유지 — 탭 시 g 스냅샷 수기로 채움)  
4. 끼니 Segmented  
5. 수정 배너  
6. 통합 입력: 음식명 → suggestions + 영양 DB → **(P1.3) 단위 Segmented(항상)** → **섭취량(단위 라벨)** → **(P1.3, 조건부) 1단위=g** → **(P1.1) 프리셋 pill** → 매크로 4종(총량) → NF 출처(해당 시)  
7. ~~템플릿 분량~~ **숨김**  
8. 저장 / 삭제  
9. 오늘 목록 (−/+ = g 또는 PORTION_COUNT 단위) — **P1.3 변경 없음**

## 2) 입력 폼

| 요소 | 스펙 |
|---|---|
| 섭취량 | 신규·수기·NF·OCR 후 **항상 표시**. 라벨 `섭취량 ({단위})`. 신규/수기 **기본 빈 칸**. OCR: `servingGrams` 있으면 채움, 없으면 빈 칸+「제공량을 확인해 주세요」토스트. 저장 시 **환산 grams** 1..5000 |
| 단위 선택 (P1.2) | 이력/템플릿 있을 때 Segmented. 수량 변경 시 매크로 연동 |
| 단위 선택 (P1.3) | **항상 표시**. 옵션 = `g` + 이력/템플릿 단위 + **기본 단위 칩**(`개`,`접시`,`공기`,`병`,`장`). 동일 라벨이 이력/템플릿에 있으면 그쪽 `servingGrams` 우선 |
| 1단위=g (P1.3) | 단위≠`g` 이고 환산 g가 없을 때 **필수 표시**. 단위=`g` 이거나 이력/템플릿/`servingGrams`가 있으면 **숨김**(이미 환산 확정). placeholder 예: `예: 50`. 범위 1..5000 |
| 이전에 쓴 양 | 동일 음식명 집계. 탭 시 **g + 해당 분량 영양** 함께 적용(칼로리 칩 하단에 표시) |
| 프리셋 (P1.1) | 하드코드 pill. 단위·1단위 매크로 있으면 개 모드로 적용 |
| 매크로 | 총량. 「섭취량(g) 기준 총 영양」(내부 grams 기준 copy 유지 가능) |
| 템플릿 선택 UI | 없음 |
| suggestions | **과거 기록만**(D-9). 템플릿 kind 미표시. 영양 DB는 별도 섹션 |

### P1.3 단위·환산 상세

| 상황 | 단위 UI | 1단위=g 필드 | 저장 |
|---|---|---|---|
| 기본(신규, 이력 없음) | Segmented: `g` + 기본 칩 | `g`면 숨김. 다른 단위면 **표시·필수** | `grams = 수량 × 1단위g` (템플릿 미매칭 → foodTemplateId 없음) |
| 이력/템플릿 단위 | 해당 라벨 포함, `servingGrams` 확정 | **숨김** | 기존 P1.2와 동일(가능 시 템플릿 경로) |
| 단위 `g` | 선택됨 | 숨김 | `grams = 수량` |

**반응형:** 모바일 Log 단일 컬럼 유지.  
**접근성:** 단위 Segmented·1단위=g 필드에 라벨. 저장 차단 시 toast/인라인으로 환산 미입력 안내.

### 1차 프리셋 (Railway 빈도)

| 매칭 | 라벨 | g |
|---|---|---|
| 계란 | 1개 | 50 |
| 소주 | 1병 | 360 |
| 맥주 | 1병 | 500 |
| 김 (정확 일치) | 1장 | 2 |
| 바나나 | 1개 | 120 |
| 라면·짜파게티·컵라면 | 1개 | 120 |

## 3) 목록 −/+

| 항목 | 스펙 |
|---|---|
| PORTION_COUNT + 템플릿 | 표시 `N{단위}`(예: `2개`). −/+ **±1 단위**. 모달은 분량 수 |
| 그 외 | 표시 `Ng`. −/+ ±**10**g. 모달은 g |
| 가짜 100 | grams 없을 때 `\|\| 100` 표시 **금지** |
| 매크로 | 비율 스케일 또는 템플릿 재계산 |
| 접근성 | g: 「10그램…」 / 단위: 「1단위 감소/증가」 |

## 4) 상태

| 상태 | 표현 |
|---|---|
| 기본 | 섭취량 **빈**, 매크로 빈, 프리셋 비매칭 시 숨김. 단위 기본 `g` |
| 환산 미입력 (P1.3) | 단위≠g 이고 1단위=g 비어 있음 → 저장 차단 + 「1단위 그램을 입력해 주세요」(또는 동등) |
| 저장 중 | Primary loading |
| g 범위 오류 | toast / 인라인 (1~5000) — 수량×환산 결과 포함 |
| 목록 adjust 중 | 기존 busy |
| 권한 | 본 범위 해당 없음(기존 Log 권한) |

## 5) 다크모드 체크리스트

- [ ] 섭취량·1단위=g 필드 라벨 대비  
- [ ] 단위 Segmented 선택/비선택 대비  
- [ ] −/+ 버튼 보더 가시  
- [ ] 프리셋 pill 보더/선택 대비  

## 6) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-21 | Phase 1 초안 |
| 0.1+승인 | 2026-07-21 | HUMAN 디자인 승인. Phase 1 구현 착수 |
| 0.2 | 2026-07-22 | Phase 1.1 레거시 목록 + 1차 프리셋 |
| 0.3 | 2026-07-22 | 신규 입력 g 기본 빈 칸(OCR·수기). placeholder 100 |
| 0.4 | 2026-07-23 | 이전에 쓴 양 칩(동일 음식명 빈도) |
| 0.5 | 2026-07-23 | 단위 선택 + 이전 양 선택 시 영양 동시 적용 |
| 0.6 | 2026-07-23 | 수기 기본100g=미입력 처리 · 이전 양 선택 표시 |
| 0.7 | 2026-08-10 | **P1.3** 단위 항상 노출·1단위=g·67 면제 |
| 0.7+승인 | 2026-08-10 | P1.3 디자인 HUMAN 승인. 구현 착수 |
