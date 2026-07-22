---
type: design-spec
project: dietManagement
status: approved
updated_at: 2026-07-22
approved_at: 2026-07-21
phase_1_1_approved_at: 2026-07-22
parent_prd: docs/requirements/feature-grams-only-transition-prd.md
parent_design: docs/design/mobile-log-input-ux-spec.md
related:
  - docs/design/mobile-log-nutrition-autofill-ux-spec.md
---

# 모바일 Log — g-only Phase 1 / 1.1 UX 스펙 (67 면제 · approved)

> PRD: [`feature-grams-only-transition-prd.md`](../requirements/feature-grams-only-transition-prd.md) **approved**.  
> **HUMAN 디자인 승인:** 2026-07-21 (= Phase 1 구현 착수).  
> **Phase 1.1:** 레거시 목록 표시 + 1차 프리셋 (대화·계획 합의 2026-07-22).

## 0) 67 면제

| 항목 | 내용 |
|---|---|
| 스코프 | Phase 1: 슬롯 제거·g 통일. Phase 1.1: **목록 표시 분기** + **폼 프리셋 pill 1행**(기존 Log 슬롯 보강). 신규 라우트 0 |
| SSOT | `mobile-log-input-ux-spec` + autofill 스펙 + 본 문서 |
| 재사용 | `LabeledField`, `MealPortionStepper`, recentMeals Pressable pill, `theme.tsx` |
| 이중안 | 면제 |
| 다크모드 | 기존 토큰만 |

## 1) 섹션 순서 (Log)

1. OCR / 사진 분석  
2. ~~템플릿 칩~~ **Phase 1 숨김**  
3. 최근 먹은 음식 (유지 — 탭 시 g 스냅샷 수기로 채움)  
4. 끼니 Segmented  
5. 수정 배너  
6. 통합 입력: 음식명 → suggestions + 영양 DB → **항상 섭취량(g)** → **(P1.1) 이름 매칭 프리셋 pill** → 매크로 4종(총량) → NF 출처(해당 시)  
7. ~~템플릿 분량~~ **숨김**  
8. 저장 / 삭제  
9. 오늘 목록 (−/+ = g 또는 PORTION_COUNT 단위)

## 2) 입력 폼

| 요소 | 스펙 |
|---|---|
| 섭취량(g) | 신규·수기·NF·OCR 후 **항상 표시**. **기본 빈 칸**(placeholder `100`). NF는 `defaultServingGrams` 있을 때만 채움. 저장 시 필수 1..5000 |
| 프리셋 (P1.1) | 음식명 매칭 시에만 g 필드 **아래** pill. 탭 → grams 설정(+ NF draft면 재환산) |
| 매크로 | 총량. 「섭취량(g) 기준 총 영양」 |
| 템플릿 선택 UI | 없음 |
| suggestions | 과거 + template kind 유지(D-9). 템플릿 탭 시 → **g 스냅샷으로 폼 채움** |

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
| 기본 | g 필드 **빈**, 매크로 빈, 프리셋 비매칭 시 숨김 |
| 저장 중 | Primary loading |
| g 범위 오류 | toast / 인라인 (1~5000) |
| 목록 adjust 중 | 기존 busy |

## 5) 다크모드 체크리스트

- [ ] g 필드·목록 라벨 대비  
- [ ] −/+ 버튼 보더 가시  
- [ ] 프리셋 pill 보더/선택 대비  

## 6) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-21 | Phase 1 초안 |
| 0.1+승인 | 2026-07-21 | HUMAN 디자인 승인. Phase 1 구현 착수 |
| 0.2 | 2026-07-22 | Phase 1.1 레거시 목록 + 1차 프리셋 |
| 0.3 | 2026-07-22 | 신규 입력 g 기본 빈 칸(OCR·수기). placeholder 100 |
