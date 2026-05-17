import { useEffect, useMemo, useState } from 'react';
import { apiFetch, isAuthDenied } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast/useToast';

type PolicyKind = 'terms' | 'privacy';

type PolicyDoc = {
  id: string | null;
  kind: string;
  body: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string | null;
};

const KIND_LABEL: Record<PolicyKind, string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
};

const BODY_MAX = 50_000;

function formatDateTime(v: string | null): string {
  if (!v) return '—';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export function PoliciesPage() {
  const { token } = useAuth();
  const toast = useToast();

  const [kind, setKind] = useState<PolicyKind>('terms');
  const [doc, setDoc] = useState<PolicyDoc | null>(null);
  const [body, setBody] = useState('');
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (next: PolicyKind) => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    setMessage(null);
    try {
      const d = await apiFetch<PolicyDoc>(`/admin/policies/${next}`, { token });
      setDoc(d);
      setBody(d.body ?? '');
      setPublish(d.publishedAt !== null);
    } catch (e) {
      if (isAuthDenied(e)) return;
      setErr(e instanceof Error ? e.message : '문서를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, token]);

  const dirty = useMemo(() => {
    const original = doc?.body ?? '';
    const wasPublished = doc?.publishedAt !== null && doc?.publishedAt !== undefined;
    return body !== original || publish !== wasPublished;
  }, [doc, body, publish]);

  const save = async () => {
    if (!token || saving) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setMessage('본문을 입력해 주세요.');
      return;
    }
    if (body.length > BODY_MAX) {
      setMessage(`본문은 ${BODY_MAX.toLocaleString()}자 이하여야 합니다.`);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const next = await apiFetch<PolicyDoc>(`/admin/policies/${kind}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ body, publish }),
      });
      setDoc(next);
      setBody(next.body);
      setPublish(next.publishedAt !== null);
      toast.show({ kind: 'success', message: '정책 문서를 저장했어요.' });
      setMessage(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장하지 못했습니다.';
      setMessage(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <div className="page-head">
        <div>
          <h2>정책 문서</h2>
          <div className="subtitle">이용약관과 개인정보처리방침을 작성하고 게시 상태를 관리합니다.</div>
        </div>
      </div>

      <div className="filter-bar" role="tablist" aria-label="정책 문서 종류 선택">
        {(Object.keys(KIND_LABEL) as PolicyKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={`btn ${kind === k ? 'btn-primary' : ''}`}
            onClick={() => setKind(k)}
            disabled={saving}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
        <div className="cluster" style={{ marginLeft: 'auto', color: 'var(--ds-fg-muted)', fontSize: 'var(--ds-text-xs)' }}>
          {doc ? (
            <>
              <span>버전 v{doc.version}</span>
              <span>·</span>
              <span>마지막 수정 {formatDateTime(doc.updatedAt)}</span>
              {doc.publishedAt ? (
                <>
                  <span>·</span>
                  <span>게시 {formatDateTime(doc.publishedAt)}</span>
                </>
              ) : (
                <>
                  <span>·</span>
                  <span>비공개</span>
                </>
              )}
            </>
          ) : (
            <span>아직 저장된 문서가 없습니다.</span>
          )}
        </div>
      </div>

      {err ? (
        <div className="banner banner-danger" role="alert">
          {err}
        </div>
      ) : null}
      {message ? (
        <div className="banner banner-warn" role="alert">
          {message}
        </div>
      ) : null}

      <div className="form-stack">
        <label className="form-field">
          본문
          <textarea
            rows={20}
            maxLength={BODY_MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={loading || saving}
            style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
          />
          <span className="form-help">
            {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}자 · 줄바꿈은 그대로 저장됩니다.
          </span>
        </label>

        <label className="filter-bar-toggle" style={{ padding: 0 }}>
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            disabled={loading || saving}
          />
          <span>게시(공개) 상태로 저장</span>
        </label>

        <div className="cluster">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void save()}
            disabled={loading || saving || !dirty}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setBody(doc?.body ?? '');
              setPublish(doc?.publishedAt != null);
              setMessage(null);
            }}
            disabled={loading || saving || !dirty}
          >
            변경 취소
          </button>
        </div>
      </div>
    </main>
  );
}
