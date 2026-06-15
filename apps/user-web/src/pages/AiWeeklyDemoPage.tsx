import { useCallback, useEffect, useState } from 'react';
import { getWeeklyReport, type WeeklyReportResponse } from '../api/insights';
import { RequireAuth } from '../components/auth/RequireAuth';
import { Banner } from '../components/ui/Banner';
import { PageTitle } from '../components/ui/PageTitle';
import { ApiError } from '../apiWithAuth';
import { staleBannerMessage } from '../lib/staleMessage';
import { AnchorDatePicker } from '../components/AnchorDatePicker';
import { todayAnchorKst } from '../lib/statsPeriod';

function WeeklyInner() {
  const [anchor, setAnchor] = useState(todayAnchorKst);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getWeeklyReport(anchor));
    } catch (e) {
      setReport(null);
      setError(e instanceof ApiError ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [anchor]);

  useEffect(() => {
    void load();
  }, [load]);

  const empty = report?.sections.overview.mealCount === 0;
  const km = report?.sections.keyMetrics;
  const goals = report?.sections.nextWeekGoals ?? report?.sections.suggestions ?? [];
  const staleMsg = staleBannerMessage(report?.isStale, report?.staleHours ?? null);

  return (
    <>
      <PageTitle title="주간 식단 리포트" subtitle="최근 7일 기록 기반 패턴·다음 주 목표" />
      <div className="card coach-anchor-bar">
        <AnchorDatePicker label="주 기준일" value={anchor} onChange={setAnchor} maxDate={todayAnchorKst()} />
      </div>
      {error ? (
        <Banner variant="error" action={<button type="button" className="btn-ghost btn-compact" onClick={() => void load()}>재시도</button>}>
          {error}
        </Banner>
      ) : null}
      {staleMsg ? <Banner variant="warn">{staleMsg}</Banner> : null}
      {loading ? <p className="muted">불러오는 중…</p> : null}
      {!loading && empty ? (
        <div className="card empty-panel">
          <p>이번 주 기록이 없어요.</p>
        </div>
      ) : null}
      {report && !empty && !loading ? (
        <>
          {km ? (
            <div className="card">
              <h3 className="card-heading">이번 주 핵심 요약</h3>
              <div className="kpi-chips">
                <span className="chip">아침 결식 {km.breakfastSkipDays}일</span>
                <span className="chip">단백질 부족 끼니 {km.proteinShortMeals}회</span>
                <span className="chip">외식·배달 {km.outsideMealCount}회</span>
                <span className="chip">채소 포함 {km.vegetableMealCount}회</span>
              </div>
            </div>
          ) : null}
          <div className="card">
            <h3 className="card-heading">한 줄 요약</h3>
            <div className="answer-box">{report.summaryText}</div>
          </div>
          {report.sections.evidence.length > 0 ? (
            <div className="card">
              <h3 className="card-heading">근거 기록</h3>
              <ul className="evidence-list">
                {report.sections.evidence.map((ev, i) => (
                  <li key={`${ev.date}-${i}`}>
                    {ev.date} {ev.slot}: {ev.foodName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {goals.length > 0 ? (
            <div className="card">
              <h3 className="card-heading">다음 주 추천 목표</h3>
              <ul className="suggestions-list">
                {goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.disclaimer ? <p className="muted">{report.disclaimer}</p> : null}
        </>
      ) : null}
    </>
  );
}

export function AiWeeklyDemoPage() {
  return (
    <RequireAuth>
      <WeeklyInner />
    </RequireAuth>
  );
}
