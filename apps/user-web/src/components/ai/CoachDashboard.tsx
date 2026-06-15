import type { InsightSummaryResponse } from '../../api/insights';
import { Banner } from '../ui/Banner';
import { DEMO_COPY } from '../../copy/demo';

type Props = {
  summary: InsightSummaryResponse | null;
  loading: boolean;
};

export function CoachDashboard({ summary, loading }: Props) {
  if (loading) {
    return (
      <section className="coach-dashboard" aria-busy="true">
        <div className="kpi-grid kpi-grid-2 coach-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card">
              <span className="kpi-label muted">불러오는 중…</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!summary) return null;

  const emptyWeek = summary.week.mealCount === 0;
  const ga = summary.week.goalAchievement;

  if (emptyWeek) {
    return (
      <div className="card empty-panel">
        <p>{summary.insight.text || DEMO_COPY.emptyWeekTitle}</p>
        <p className="muted">{DEMO_COPY.emptyWeekHint}</p>
      </div>
    );
  }

  return (
    <section className="coach-dashboard">
      <div className="card report-hero">
        <span className="chip">{summary.week.period.label}</span>
        <span className="muted">
          기록 {summary.week.recordedDays}일 · 식사 {summary.week.mealCount}건
        </span>
      </div>
      <div className="kpi-grid kpi-grid-2">
        <div className="kpi-card">
          <span className="kpi-label">오늘 칼로리</span>
          <strong>{Math.round(summary.today.summary.calories)}</strong>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">주간 일평균 단백질</span>
          <strong>{Math.round(summary.week.summary.protein)}</strong>
          <span className="kpi-unit">g</span>
        </div>
      </div>
      <div className="card coach-insight">
        <Banner variant="info">규칙 기준 제안</Banner>
        <div className="answer-box">{summary.insight.text}</div>
      </div>
      {ga.proteinShortDays > 0 ? (
        <p className="muted">단백질 부족 {ga.proteinShortDays}일 · 칼로리 미달 {ga.calorieShortDays}일</p>
      ) : null}
    </section>
  );
}
