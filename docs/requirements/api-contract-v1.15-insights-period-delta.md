---
type: contract
project: dietManagement
doc_lane: requirements
version: v1.15
base: v1.14
updated_at: 2026-06-15
tags: [api, contract, insights, delta]
---

# API Contract v1.15 — 인사이트 주간 기간·지표 축소 (delta)

> 기준: `api-contract-v1.14-insights-delta.md`  
> **변경:** `week_single` 롤링 7일, 채소·외식 휴리스틱 지표 제거

## 1) 주간 기간 (`week_single`)

인사이트 주간 집계·리포트·summary `week` 블록은 **KST 롤링 7일**을 사용한다.

| 항목 | v1.14 (이전) | v1.15 (이후) |
|------|--------------|--------------|
| 구간 | anchor가 속한 달력 주 (일요일~토요일) | **anchor 포함 과거 6일 ~ anchor** (7일) |
| `period.label` 예 | `6월 1일 – 6월 7일` (일~토) | `6월 9일 – 6월 15일` (롤링) |
| `periodEndGoalDate` (week) | 해당 주 토요일 | **anchor** (구간 종료일) |
| 주간 캐시 키 (`AiPeriodReport`) | 해당 주 일요일 | **anchor** (구간 종료일) |

**통계 API** (`GET /stats?range=week`) 6주 차트는 **변경 없음** (달력 주 유지).

## 2) `sections.keyMetrics` (주간·월간)

| 필드 | v1.15 |
|------|-------|
| `breakfastSkipDays` | 유지 |
| `proteinShortMeals` | 유지 |
| `outsideMealCount` | **삭제** |
| `vegetableMealCount` | **삭제** |

## 3) `comparison` (월간 리포트)

| 필드 | v1.15 |
|------|-------|
| `recordedDaysDelta` | 유지 |
| `previousLabel` | 유지 |
| `vegetableMealDelta` | **삭제** |
| `outsideMealDelta` | **삭제** |

## 4) 패턴·목표 (동작 변경)

다음 패턴·목표는 **생성하지 않음**:

- `outside_food`, `low_vegetable`, `veg_improved`
- 외식·배달·채소 관련 `nextWeekGoals` / `nextMonthGoals`

## 5) 영향 엔드포인트

- `GET /me/insights/summary` — `week.period`, `goalAchievement` 집계 구간
- `GET /me/insights/reports/weekly` — `period`, `sections.keyMetrics`
- `GET /me/insights/reports/monthly` — `sections.keyMetrics`, `comparison`

## 6) 하위 호환

v1.14 클라이언트는 삭제 필드를 참조할 수 있음. 모바일·user-web은 v1.15와 함께 배포한다.

## 7) 리포트 캐시

`AiPeriodReport.payload`에 `_payloadVersion` 메타를 저장한다. 서버의 `AI_PERIOD_REPORT_PAYLOAD_VERSION`과 다르거나 없으면 캐시를 무시하고 재집계한다. API 응답에는 `_payloadVersion`을 포함하지 않는다.
