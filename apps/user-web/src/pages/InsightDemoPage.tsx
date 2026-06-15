import { useCallback, useEffect, useState } from 'react';
import { getInsightSummary, type InsightSummaryResponse } from '../api/insights';
import { CoachDashboard } from '../components/ai/CoachDashboard';
import { CoachSummarySkeleton } from '../components/ai/CoachSummarySkeleton';
import { RequireAuth } from '../components/auth/RequireAuth';
import { Banner } from '../components/ui/Banner';
import { PageTitle } from '../components/ui/PageTitle';
import { ApiError } from '../apiWithAuth';
import { staleBannerMessage } from '../lib/staleMessage';
import { AnchorDatePicker } from '../components/AnchorDatePicker';
import { todayAnchorKst } from '../lib/statsPeriod';

function InsightInner() {
  const [anchor, setAnchor] = useState(todayAnchorKst);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InsightSummaryResponse | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await getInsightSummary(anchor));
    } catch (e) {
      setSummary(null);
      setSummaryError(e instanceof ApiError ? e.message : '요약 불러오기 실패');
    } finally {
      setSummaryLoading(false);
    }
  }, [anchor]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const staleMsg = staleBannerMessage(summary?.isStale, summary?.staleHours ?? null);

  return (
    <>
      <PageTitle title="식단 인사이트" subtitle="주간·오늘 기록 요약과 패턴" />
      <div className="card coach-anchor-bar">
        <AnchorDatePicker label="기준일" value={anchor} onChange={setAnchor} maxDate={todayAnchorKst()} />
      </div>
      {summaryError ? (
        <Banner variant="error" action={<button type="button" className="btn-ghost btn-compact" onClick={() => void loadSummary()}>재시도</button>}>
          {summaryError}
        </Banner>
      ) : null}
      {staleMsg ? <Banner variant="warn">{staleMsg}</Banner> : null}
      {summaryLoading ? <CoachSummarySkeleton /> : null}
      {!summaryLoading ? <CoachDashboard summary={summary} loading={false} /> : null}
      {summary?.disclaimer ? <p className="muted">{summary.disclaimer}</p> : null}
    </>
  );
}

export function InsightDemoPage() {
  return (
    <RequireAuth>
      <InsightInner />
    </RequireAuth>
  );
}
