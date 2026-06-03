import { useCallback, useEffect, useState } from 'react';
import { getMonthlyReport, type MonthlyReportResponse } from '../api/ai';
import { RequireAuth } from '../components/auth/RequireAuth';
import { Banner } from '../components/ui/Banner';
import { PageTitle } from '../components/ui/PageTitle';
import { ApiError } from '../apiWithAuth';
import { staleBannerMessage } from '../lib/staleMessage';
import { addMonthsYmd, currentMonthStartYmd } from '../lib/statsPeriod';

function MonthlyInner() {
  const currentMonthStart = currentMonthStartYmd();
  const [monthAnchor, setMonthAnchor] = useState(currentMonthStart);
  const anchor = monthAnchor;
  const atCurrentMonth = monthAnchor >= currentMonthStart;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getMonthlyReport(anchor));
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
  const staleMsg = staleBannerMessage(report?.isStale, report?.staleHours ?? null);

  return (
    <>
      <PageTitle title="월간 영양 패턴 분석" subtitle="한 달 습관·추세·다음 달 목표" />
      <div className="card">
        <div className="stats-period-nav">
          <button
            type="button"
            className="btn-ghost btn-compact"
            disabled={loading}
            onClick={() => setMonthAnchor((a) => addMonthsYmd(a, -1))}
          >
            이전 달
          </button>
          <span className="chip">{report?.period.label ?? anchor.slice(0, 7)}</span>
          <button
            type="button"
            className="btn-ghost btn-compact"
            disabled={loading || atCurrentMonth}
            onClick={() => setMonthAnchor((a) => addMonthsYmd(a, 1))}
          >
            다음 달
          </button>
        </div>
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
          <p>이번 달 기록이 없어요.</p>
        </div>
      ) : null}
      {report && !empty && !loading ? (
        <>
          {report.sections.recurringPatterns.length > 0 ? (
            <div className="card">
              <h3 className="card-heading">반복 패턴</h3>
              <ul className="suggestions-list">
                {report.sections.recurringPatterns.map((p) => (
                  <li key={p.id}>
                    <strong>{p.title}</strong> — {p.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.sections.improvementTrends.length > 0 ? (
            <div className="card">
              <h3 className="card-heading">개선 추세</h3>
              <ul className="suggestions-list">
                {report.sections.improvementTrends.map((p) => (
                  <li key={p.id}>{p.detail}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="card">
            <h3 className="card-heading">AI 분석</h3>
            {!report.llm.used ? <Banner variant="info">템플릿 요약 (LLM 미사용 가능)</Banner> : null}
            <div className="answer-box">{report.summaryText}</div>
          </div>
          {report.sections.nextMonthGoals.length > 0 ? (
            <div className="card">
              <h3 className="card-heading">다음 달 목표</h3>
              <ul className="suggestions-list">
                {report.sections.nextMonthGoals.map((g) => (
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

export function AiMonthlyDemoPage() {
  return (
    <RequireAuth>
      <MonthlyInner />
    </RequireAuth>
  );
}
