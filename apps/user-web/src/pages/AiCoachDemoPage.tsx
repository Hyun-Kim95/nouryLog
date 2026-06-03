import { useCallback, useEffect, useState } from 'react';
import { getCoachSummary, postAiAsk, type AiAskResponse, type CoachSummaryResponse } from '../api/ai';
import { CitationCards } from '../components/ai/CitationCards';
import { CoachSummarySkeleton } from '../components/ai/CoachSummarySkeleton';
import { RequireAuth } from '../components/auth/RequireAuth';
import { Banner } from '../components/ui/Banner';
import { PageTitle } from '../components/ui/PageTitle';
import { ApiError } from '../apiWithAuth';
import { staleBannerMessage } from '../lib/staleMessage';
import { AnchorDatePicker } from '../components/AnchorDatePicker';
import { todayAnchorKst } from '../lib/statsPeriod';

function CoachInner() {
  const [anchor, setAnchor] = useState(todayAnchorKst);
  const [question, setQuestion] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CoachSummaryResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAskResponse | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await getCoachSummary(anchor);
      setSummary(res);
      setQuestion((prev) => (prev.trim() ? prev : (res.suggestedQuestions[0]?.question ?? '')));
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

  const submit = async () => {
    setAskLoading(true);
    setAskError(null);
    try {
      setResult(await postAiAsk({ question: question.trim(), contextAnchor: anchor }));
    } catch (e) {
      setAskError(e instanceof ApiError ? e.message : '요청 실패');
    } finally {
      setAskLoading(false);
    }
  };

  const staleMsg = staleBannerMessage(
    summary?.isStale || result?.isStale,
    summary?.staleHours ?? result?.staleHours ?? null,
  );

  return (
    <>
      <PageTitle title="AI 코치" subtitle="RAG 질문 + 근거 식단 citation" />
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
      {!summaryLoading && summary ? (
        <div className="card coach-insight-strip">
          <p className="muted">오늘·주간 요약</p>
          <div className="answer-box">{summary.insight.text}</div>
        </div>
      ) : null}
      <div className="card chat-compose">
        <h3 className="card-heading">질문하기</h3>
        <textarea className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
        {summary?.suggestedQuestions.length ? (
          <div className="example-chips">
            {summary.suggestedQuestions.map((q) => (
              <button key={q.label} type="button" className="chip-btn" onClick={() => setQuestion(q.question)}>
                {q.label}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" className="btn" disabled={askLoading || !question.trim()} onClick={() => void submit()}>
          {askLoading ? '분석 중…' : '질문하기'}
        </button>
      </div>
      {askError ? <Banner variant="error">{askError}</Banner> : null}
      {result ? (
        <div className="chat-thread">
          <div className="bubble bubble-user">{question}</div>
          <div className="bubble bubble-ai">
            <div className="answer-box">{result.answer}</div>
            <CitationCards citations={result.citations} />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AiCoachDemoPage() {
  return (
    <RequireAuth>
      <CoachInner />
    </RequireAuth>
  );
}
