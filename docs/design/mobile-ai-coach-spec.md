---
type: design-spec
project: dietManagement
updated_at: 2026-06-03
---

# 모바일 AI 코치·리포트 UI

> **Deprecated (2026-06-15):** `AiCoach`·`CoachHomeCard`·`/me/ai/*`는 **식단 인사이트**(`DietInsight`, `InsightHomeCard`, `/me/insights/*`)로 대체되었습니다.  
> 질문하기(RAG) UI는 제거되었습니다. **현행 스펙:** [`mobile-insights-spec.md`](./mobile-insights-spec.md)

API: v1.12 coach summary, v1.11 ask/RAG, **v1.13** weekly/monthly reports

## 정보 구조

| 진입 | 화면 | API |
|------|------|-----|
| 홈 `CoachHomeCard` | 요약 + 코치 열기 | `GET /me/ai/coach/summary` |
| `AiCoach` | 대시보드 + **주간 리포트 카드** + 챗 | summary, `GET /me/ai/reports/weekly`, `POST /me/ai/ask` |
| 통계 · **월** | 차트 + **월간 패턴 카드** | `GET /stats`, `GET /me/ai/reports/monthly` |

## 주간 리포트 카드 (`WeeklyReportCard`)

1. 이번 주 핵심 요약 (`keyMetrics` 칩)
2. AI 코멘트 (`summaryText`)
3. 근거 기록 (`evidence`)
4. 다음 주 추천 목표 (`nextWeekGoals`)

## 월간 패턴 카드 (`MonthlyPatternCard`)

1. 반복 패턴
2. 개선 추세
3. AI 분석 (`summaryText`)
4. 다음 달 목표

## 상태

로딩 / 오류+재시도 / 빈 기록 / stale / LLM 미사용 info / 면책 `disclaimer`

## 파일

- `apps/mobile/src/components/ai/WeeklyReportCard.tsx`
- `apps/mobile/src/components/ai/MonthlyPatternCard.tsx`
- `apps/mobile/src/screens/AiCoachScreen.tsx`
- `apps/mobile/src/screens/StatsScreen.tsx` (range=month)
