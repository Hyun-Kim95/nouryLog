---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-17
tags: [requirements, mobile-app, log, meals, recommendation-range]
version: 0.1
---

# 모바일 기록·권장량 UX 개선 PRD v0.1

## 1) 목적

기록 탭(LogScreen) 사용성 개선 5건과 일일 권장량 범위 저장·표시 1건을 한 번에 반영한다.

## 2) 수용 기준 (AC)

### #1 끼니 라벨

- `SNACK` 슬롯 UI 라벨은 「간식」이다(「추가」 사용 안 함).

### #2 라벨 고정 입력

- 음식명·칼로리·단백질·탄수화물·지방 입력 시 **값이 있어도** 필드 앞(또는 위)에 라벨이 항상 보인다.
- OCR 검수·템플릿 분량 입력에도 동일 패턴(해당 필드만).

### #3 통합 빠른 선택

- 「직접 입력 / 템플릿」 Segmented 없음.
- 섹션 순서: OCR → **템플릿 칩** → **최근 먹은 음식** → 끼니 → 통합 폼 → 저장 → 최근 기록.
- 템플릿 칩 탭 → 분량 UI + 저장 시 템플릿 POST.
- 최근 칩 탭 → 폼 prefilled(템플릿 연동 시 템플릿 모드).

### #4 수정·삭제

- 최근 기록 행 탭 → 폼 prefilled + 「○○ 수정 중」 배너.
- 저장: `PUT /meals/{mealId}` (신규는 `POST`).
- 삭제: 확인 후 `PATCH /meals/{mealId}/deactivate`.
- `consumedAt` 변경은 본 Phase 범위 외(기존 시각 유지).

### #5 한글 매크로

- 기록 목록·최근 칩 부가 정보: `단백질 Ng · 탄수 Ng · 지방 Ng` (P/C/F 약어 금지).

### #6 일일 권장량 범위

- Profile에 min/max 4필드 저장.
- `proteinGoalG` / `calorieGoalKcal`는 **중심값**(알림·ProgressBar 기준점) 유지.
- 범위 산출 정책(확정):
  - **단백질:** 중심값 ±5%, 최소 폭 10g (`max(5, round(center*0.05))` g each side).
  - **칼로리 maintain:** 중심값 ±10%.
  - **칼로리 lose:** 하한 = `round(center*0.9)`, 상한 = center.
  - **칼로리 gain:** 하한 = center, 상한 = `round(center*1.1)`.
- **알림:** 단백질 미달 = 당일 섭취 `< proteinGoalMinG`; 칼로리는 goal별 기존 방향 유지하되 상·하한은 범위 필드 사용.
- **override:** 사용자 단일값 저장 시 서버가 동일 규칙으로 min/max 재계산.

## 3) 비목표

- 식사 `consumedAt` 편집 UI.
- 음식 템플릿 CRUD(관리자).
- 신규 라우트 화면.

## 4) 관련 문서

- `docs/design/mobile-log-input-ux-spec.md`
- `docs/requirements/api-contract-v1.5-delta.md`
- `feature-recommendation-v14-prd.md` (대표값 필드 유지)
- `feature-recommendation-override-prd.md` (DB 컬럼 — 범위 4필드 추가로 supersede)
