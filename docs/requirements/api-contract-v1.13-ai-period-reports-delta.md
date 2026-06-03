# API Contract v1.13 — AI 주간·월간 리포트 (delta)

## GET /me/ai/reports/weekly

기존 응답에 **하위 호환**으로 `sections` 확장:

| 필드 | 타입 | 설명 |
|------|------|------|
| `sections.keyMetrics` | object | `breakfastSkipDays`, `proteinShortMeals`, `outsideMealCount`, `vegetableMealCount` |
| `sections.patterns` | array | `{ id, title, detail }` |
| `sections.evidence` | array | `{ date, slot, foodName, mealId? }` |
| `sections.nextWeekGoals` | string[] | 다음 주 목표 |
| `sections.suggestions` | string[] | `nextWeekGoals`와 동일 내용 (레거시) |

## GET /me/ai/reports/monthly (신규)

Query: `anchor` (KST YYYY-MM-DD, optional, default today)

| 필드 | 설명 |
|------|------|
| `sections.recurringPatterns` | 반복 습관 |
| `sections.improvementTrends` | 전월 대비 개선 |
| `sections.breakfastSkipByWeekday` | 요일별 아침 결식 |
| `sections.nextMonthGoals` | 다음 달 목표 |
| `comparison` | `recordedDaysDelta`, `vegetableMealDelta`, `outsideMealDelta`, `previousLabel` |
| `summaryText` | AI 서술 (면책 포함) |
| `disclaimer` | 비진단 고지 |

## 캐시

`AiPeriodReport` 테이블 — `userId` + `kind` (`week`|`month`) + 정규화 `anchor`(주=해당 주 일요일, 월=해당 월 1일) + `mealsRevision`.

동일 기간 식단(활성 건수·생성·비활성 시각)이 변하지 않으면 저장된 `payload`를 재사용한다(LLM·집계 생략).

## 톤

의료 진단·치료 표현 금지. “기록 기준으로는 …” 형태 권장.
