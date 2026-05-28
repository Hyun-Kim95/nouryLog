---
type: api-contract
project: dietManagement
status: approved
parent: docs/requirements/feature-diet-management-api-contract-v1.md
updated_at: 2026-05-17
version: 1.5-delta
---

# API 계약 v1.5 델타 — 권장량 범위

## Profile 필드 추가

`GET /me/profile`, `PUT /me/profile` 응답/저장 후 응답, `POST /me/recommendation/recalculate` 응답:

| 필드 | 타입 | 설명 |
|------|------|------|
| `proteinGoalMinG` | int? | 일일 단백질 권장 하한 |
| `proteinGoalMaxG` | int? | 일일 단백질 권장 상한 |
| `calorieGoalMinKcal` | int? | 일일 칼로리 권장 하한 |
| `calorieGoalMaxKcal` | int? | 일일 칼로리 권장 상한 |

기존 `proteinGoalG`, `calorieGoalKcal`는 **중심값**으로 유지한다.

## 범위 산출 (서버 SSOT)

`apps/server/src/lib/recommendation.ts` — `computeGoalRanges(centerProteinG, centerCalorieKcal, goal)`.

- recalculate 시 4범위 + 중심값 DB 저장.
- `PUT /me/profile`에 `proteinGoalG`/`calorieGoalKcal`만내도 서버가 범위 재계산(override).

## 알림 (클라이언트)

`fetchTodayShortfall`: 단백질 미달 = `proteinSum < proteinGoalMinG` (min 없으면 `proteinGoalG` 폴백).

## Meals

`GET /me/meal-entry-suggestions?q=&limit=` — 기록 추가 음식명 자동완성(활성 템플릿 + 사용자 활성 식사, 이름 contains, 템플릿 우선·이름 중복 제거). OpenAPI `v1.5.0`.

`PUT /meals/{mealId}`, `PATCH /meals/{mealId}/deactivate` — v1.4 그대로.
