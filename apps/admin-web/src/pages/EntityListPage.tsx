import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import { apiFetch } from '../api';

type Kind = 'members' | 'foods' | 'inquiries' | 'notices';

const PATH: Record<Kind, string> = {
  members: '/admin/users',
  foods: '/admin/foods',
  inquiries: '/admin/inquiries',
  notices: '/admin/notices',
};

const TITLE: Record<Kind, string> = {
  members: '회원',
  foods: '음식 템플릿',
  inquiries: '문의',
  notices: '공지',
};

type Row = Record<string, unknown>;

export function EntityListPage({ kind }: { kind: Kind }) {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [size] = useState(15);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(size));
    if (query.trim()) p.set('query', query.trim());
    if (status !== 'all') p.set('status', status);
    if (includeInactive) p.set('includeInactive', 'true');
    return p.toString();
  }, [page, size, query, status, includeInactive]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<{ total: number; items: Row[] }>(`${PATH[kind]}?${qs}`, { token });
      setTotal(res.total);
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '목록 오류');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, kind, qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setIncludeInactive(false);
    setPage(1);
  };

  const columns = useMemo(() => {
    if (kind === 'members') return ['email', 'status', 'createdAt'] as const;
    if (kind === 'foods') return ['name', 'status', 'memo'] as const;
    if (kind === 'inquiries') return ['subject', 'status', 'createdAt'] as const;
    return ['title', 'active', 'createdAt'] as const;
  }, [kind]);

  return (
    <main>
      <h2 style={{ marginTop: 0 }}>{TITLE[kind]}</h2>
      <div className="filter-bar">
        <label>
          검색
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="키워드" />
        </label>
        <label>
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            {kind === 'inquiries' && <option value="done">완료</option>}
            {kind === 'inquiries' && <option value="pending">처리중</option>}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void load()}>
          검색
        </button>
        <button type="button" className="btn" onClick={resetFilters}>
          초기화
        </button>
      </div>
      <label className="row" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
        비활성 포함
      </label>

      {loading && <p>로딩…</p>}
      {err && <div className="banner banner-danger">{err}</div>}

      {!loading && !err && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((c) => (
                      <td key={c}>{formatCell(row[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="페이지네이션">
            <button
              type="button"
              className="btn"
              aria-label="이전 페이지"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            <span className="current" aria-current="page">
              {page}
            </span>
            <span style={{ padding: '0 0.35rem', color: 'var(--muted)' }}>/ {totalPages}</span>
            <button
              type="button"
              className="btn"
              aria-label="다음 페이지"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </nav>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
            페이지당 {size}건 · 총 {total}건
          </p>
        </>
      )}
    </main>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  return String(v);
}
