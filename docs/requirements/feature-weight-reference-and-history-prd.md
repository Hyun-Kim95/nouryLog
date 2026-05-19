---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-19
tags: [requirements, prd, weight, body-composition, mobile]
version: 0.1
---

# 체중 이력·참고 체중 구간 PRD v0.1

## 1) 목적

- 주간 체중 기록(`WeightEntry`)을 사용자가 **통계 탭에서 조회**할 수 있게 한다.
- 온보딩·프로필에서 **BMI 기반 참고 체중 구간**을 보여 주고, 감량/유지/증량 선택을 돕는다(자동 전환 없음).
- 삼성 헬스·Health Connect 연동은 **범위 외**.

## 2) 비목표

- 체지방·골격근·삼성 헬스 동기화
- 목표 유형(lose/maintain/gain) 자동 변경
- 프로필 체중 수정 시 `WeightEntry` 자동 생성([api-contract v1.8](api-contract-v1.8-weight-entries-delta.md) 유지)
- 체중 이력 수정·삭제

## 3) 참고 체중 정책

| 항목 | 값 |
|------|-----|
| BMI 하한·상한 | 18.5 ~ **23.0** (아시아권 일반 참고; 의료 처방 아님) |
| kg 환산 | `BMI × (heightCm/100)²`, 소수 1자리 |
| 성별 | 구간 계산에 미사용(문구·힌트만) |
| 연령 | `<19`: `teen_caution`, 감량 강조 문구 금지 / `65+`: `older_adult_caution` |
| suggestedGoal | 힌트 전용(`lose`/`maintain`/`gain`), DB 미저장 |

## 4) UI

| 화면 | 변경 |
|------|------|
| 통계 탭 하단 | 체중 추이 차트 + 최근 기록 리스트 + 「체중 기록」→ 기존 `WeightCheckInModal` |
| 온보딩 | 신장·체중 입력 후 참고 카드 → 목표 라디오 |
| 프로필 편집 | 동일 참고 카드 |
| 홈 | 기존 주간 모달 유지 |

체중 차트 v1: **최근 90일** `WeightEntry` (영양 통계 일/주/월과 독립).

## 5) API

- `GET /me/weight-entries` — 목록(페이지네이션)
- `GET /me/reference-weight` — 참고 구간·힌트

상세: [api-contract-v1.9-weight-history-reference.md](api-contract-v1.9-weight-history-reference.md)

## 6) 면책

v1.4 권장 계산과 동일: 「추정·참고」. 질환·임신·청소년·고령 등은 전문가 상담 안내.

## 7) 디자인

[feature-weight-history-spec.md](../design/feature-weight-history-spec.md) (67 면제 단일안)
