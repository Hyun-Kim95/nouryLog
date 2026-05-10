import { useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { Drawer } from '../components/Drawer';
import { useToast } from '../toast/useToast';
import { EntityListPage } from './EntityListPage';
import type { Row } from './entityColumns';

type Period = '' | '7' | '30' | '90';
type InquiryStatus = 'pending' | 'in_progress' | 'done';

type InquiryDetail = {
  id: string;
  userId: string | null;
  subject: string;
  body: string;
  status: InquiryStatus;
  active: boolean;
  answer: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
  createdAt: string;
};

function rangeFromPeriod(period: Period): Record<string, string> {
  if (!period) return {};
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Number(period));
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatDateTime(v: string | null): string {
  if (!v) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
}

export function InquiriesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const extraQuery = useMemo(() => rangeFromPeriod(period), [period]);
  const reload = () => setReloadKey((v) => v + 1);

  const openDetail = async (row: Row) => {
    if (!token) return;
    const id = String(row.id ?? '');
    if (!id) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await apiFetch<InquiryDetail>(`/admin/inquiries/${id}`, { token });
      setDetail(next);
      setAnswerDraft(next.answer ?? '');
      setDrawerOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '문의 상세를 불러오지 못했습니다.';
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!token || !detail || busy) return;
    const answer = answerDraft.trim();
    if (!answer) {
      setMessage('답변 내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const next = await apiFetch<InquiryDetail>(`/admin/inquiries/${detail.id}/answer`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ answer }),
      });
      setDetail(next);
      reload();
      setMessage('답변이 등록되어 완료 상태로 전환되었습니다.');
      toast.show({ kind: 'success', message: '답변을 등록했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '답변을 등록하지 못했습니다.';
      setMessage(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!token || !detail || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/inquiries/${detail.id}/deactivate`, { method: 'PATCH', token });
      setDrawerOpen(false);
      reload();
      toast.show({ kind: 'success', message: '비활성으로 처리했어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '비활성 처리하지 못했습니다.';
      setMessage(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntityListPage
      kind="inquiries"
      reloadKey={reloadKey}
      extraQuery={extraQuery}
      onResetExtraFilters={() => setPeriod('')}
      extraFilters={
        <label>
          기간
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="">전체</option>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
          </select>
        </label>
      }
      onRowClick={(row) => void openDetail(row)}
      drawer={
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="문의 상세"
          width={560}
          hideHeaderClose
          footer={
            <>
              <button
                type="button"
                className="btn btn-row btn-danger-ghost"
                onClick={() => void deactivate()}
                disabled={busy}
              >
                비활성
              </button>
              <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
                닫기
              </button>
            </>
          }
        >
          {detail ? (
            <div className="form-stack">
              {message ? (
                <div
                  className={message.includes('되었습니다') ? 'banner banner-info' : 'banner banner-danger'}
                  role="alert"
                >
                  {message}
                </div>
              ) : null}
              <div className="detail-block">
                <div className="form-help">등록일 {formatDateTime(detail.createdAt)}</div>
                <h3>{detail.subject}</h3>
                <p>{detail.body}</p>
                <div className="form-help">작성자: {detail.userId ?? '비회원/알 수 없음'}</div>
              </div>
              <div className="form-help">
                답변을 등록하면 자동으로 완료 상태로 전환됩니다. 별도의 상태 변경은 필요하지 않습니다.
              </div>
              <label className="form-field">
                답변
                <textarea
                  rows={8}
                  maxLength={4000}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                />
                <span className="form-help">
                  {answerDraft.length}/4000
                  {detail.answeredAt ? ` · 마지막 답변: ${formatDateTime(detail.answeredAt)}` : ''}
                </span>
              </label>
              <button type="button" className="btn btn-primary" onClick={() => void submitAnswer()} disabled={busy}>
                {busy ? '처리 중…' : '답변 등록'}
              </button>
            </div>
          ) : (
            <div className="skeleton" style={{ width: '80%' }} />
          )}
        </Drawer>
      }
    />
  );
}
