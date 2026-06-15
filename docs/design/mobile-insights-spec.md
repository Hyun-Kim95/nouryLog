---
type: design-spec
project: dietManagement
updated_at: 2026-06-15
supersedes: docs/design/mobile-ai-coach-spec.md
---

# 모바일 식단 인사이트 UI

API: [`api-contract-v1.14-insights-delta.md`](../requirements/api-contract-v1.14-insights-delta.md)

## 정보 구조

| 진입 | 화면 | API |
|------|------|-----|
| 홈 `InsightHomeCard` | 요약 + 인사이트 열기 | `GET /me/insights/summary` |
| `DietInsight` (표시명: 식단 인사이트) | 대시보드 + **주간 리포트 카드** | summary, `GET /me/insights/reports/weekly` |
| 통계 · **월** | 차트 + **월간 패턴 카드** | `GET /stats`, `GET /me/insights/reports/monthly` |

질문하기(RAG) UI 없음. `llm`·`suggestedQuestions` 응답 필드 없음.

## 주간 리포트 카드 (`WeeklyReportCard`)

1. 이번 주 핵심 요약 (`keyMetrics` 칩)
2. 한 줄 요약 (`summaryText`, 규칙 템플릿)
3. 근거 기록 (`evidence`)
4. 다음 주 추천 목표 (`nextWeekGoals`)

## 월간 패턴 카드 (`MonthlyPatternCard`)

1. 반복 패턴
2. 개선 추세
3. 한 달 요약 (`summaryText`)
4. 다음 달 목표

## 상태

로딩 / 오류+재시도 / 빈 기록 / stale / 면책 `disclaimer`

## 카피 (`INSIGHT_COPY`)

- 화면: `식단 인사이트` / `주간·오늘 기록 요약과 패턴`
- 홈 카드: `식단 인사이트` · `자세히 보기`
- 제안 섹션: `이번 주 제안`
- 주간 리포트: `이번 주 식단 리포트` · `한 줄 요약`

## 파일

- `apps/mobile/src/components/insights/InsightHomeCard.tsx`
- `apps/mobile/src/components/insights/InsightDashboard.tsx`
- `apps/mobile/src/components/insights/WeeklyReportCard.tsx`
- `apps/mobile/src/components/insights/MonthlyPatternCard.tsx`
- `apps/mobile/src/screens/InsightScreen.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/StatsScreen.tsx` (range=month)
- `apps/mobile/src/api/insights.ts`
- `apps/mobile/src/copy/insights.ts`
