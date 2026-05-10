import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth';
import { apiFetch, isAuthDenied } from '../api';
import { EmptyState } from '../components/EmptyState';
import { ForbiddenState } from '../components/ForbiddenState';
import { COLUMNS, KIND_PATH, KIND_TITLE, type Kind, type Row } from './entityColumns';

const PAGE_SIZE = 15;

export type EntityHeaderAction = {
  label: string;
  onClick: () => void;
  tone?: 'primary' | 'ghost';
  disabled?: boolean;
};

export type EntityListPageProps = {
  kind: Kind;
  headerAction?: EntityHeaderAction;
  drawer?: ReactNode;
  emptyAction?: EntityHeaderAction;
  extraFilters?: ReactNode;
  extraQuery?: Record<string, string>;
  onResetExtraFilters?: () => void;
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  reloadKey?: number;
};

export function EntityListPage({
  kind,
  headerAction,
  drawer,
  emptyAction,
  extraFilters,
  extraQuery,
  onResetExtraFilters,
  rowActions,
  onRowClick,
  reloadKey = 0,
}: EntityListPageProps) {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({ query: '', status: 'all', includeInactive: false });
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('size', String(PAGE_SIZE));
    if (appliedFilters.query.trim()) p.set('query', appliedFilters.query.trim());
    if (appliedFilters.status !== 'all') p.set('status', appliedFilters.status);
    if (appliedFilters.includeInactive) p.set('includeInactive', 'true');
    Object.entries(extraQuery ?? {}).forEach(([key, value]) => {
      if (value) p.set(key, value);
    });
    return p.toString();
  }, [page, appliedFilters, extraQuery]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    setForbidden(false);
    try {
      const res = await apiFetch<{ total: number; items: Row[] }>(`${KIND_PATH[kind]}?${qs}`, { token });
      setTotal(res.total);
      setItems(res.items);
    } catch (e) {
      if (isAuthDenied(e)) {
        setForbidden(true);
        setItems([]);
        setTotal(0);
      } else {
        setErr(e instanceof Error ? e.message : '목록을 불러오지 못했습니다');
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [token, kind, qs]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = () => {
    setAppliedFilters({ query, status, includeInactive });
    setPage(1);
  };

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setIncludeInactive(false);
    onResetExtraFilters?.();
    setAppliedFilters({ query: '', status: 'all', includeInactive: false });
    setPage(1);
  };

  const hasFilters =
    appliedFilters.query.trim() !== '' ||
    appliedFilters.status !== 'all' ||
    appliedFilters.includeInactive ||
    Object.values(extraQuery ?? {}).some(Boolean);

  const columns = COLUMNS[kind];

  const headerActionButton = headerAction ? (
    <button
      type="button"
      className={`btn ${headerAction.tone === 'ghost' ? '' : 'btn-primary'}`}
      onClick={headerAction.onClick}
      disabled={headerAction.disabled}
    >
      {headerAction.label}
    </button>
  ) : null;

  return (
    <main>
      <div className="page-head">
        <div>
          <h2>{KIND_TITLE[kind]}</h2>
          <div className="subtitle">필터·검색 후 페이지당 {PAGE_SIZE}건 단위로 표시됩니다.</div>
        </div>
        {headerActionButton}
      </div>

      <div className="filter-bar">
        <label>
          검색
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="키워드"
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
          />
        </label>
        <label>
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            {kind === 'inquiries' && <option value="pending">접수</option>}
            {kind === 'inquiries' && <option value="in_progress">처리중</option>}
            {kind === 'inquiries' && <option value="done">완료</option>}
          </select>
        </label>
        {extraFilters}
        <label className="filter-bar-toggle">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          <span>비활성 포함</span>
        </label>
        <div className="cluster" style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn btn-primary" onClick={applyFilters}>
            검색
          </button>
          <button type="button" className="btn" onClick={resetFilters}>
            초기화
          </button>
        </div>
      </div>

      {forbidden ? (
        <ForbiddenState description="이 목록을 조회할 권한이 없습니다. 관리자 계정으로 다시 로그인하거나 권한 담당자에게 문의해 주세요." />
      ) : err ? (
        <>
          <div className="banner banner-danger" role="alert">
            {err}
          </div>
          <div className="cluster">
            <button type="button" className="btn" onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        </>
      ) : loading ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))}
                {rowActions ? <th style={{ width: '160px' }}>관리</th> : null}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} aria-busy="true">
                  {columns.map((c) => (
                    <td key={c.key}>
                      <div className="skeleton" style={{ width: '70%' }} />
                    </td>
                  ))}
                  {rowActions ? (
                    <td>
                      <div className="skeleton" style={{ width: '60%' }} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? '검색 결과가 없습니다' : `${KIND_TITLE[kind]} 데이터가 아직 없습니다`}
          description={
            hasFilters
              ? '필터 조건을 조정해 보거나 초기화하세요.'
              : '새로운 데이터가 등록되면 이곳에 표시됩니다.'
          }
          actionLabel={
            hasFilters ? '필터 초기화' : emptyAction?.label
          }
          onAction={
            hasFilters ? resetFilters : emptyAction?.onClick
          }
        />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                      {c.label}
                    </th>
                  ))}
                  {rowActions ? <th style={{ width: '160px' }}>관리</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr
                    key={idx}
                    className={onRowClick ? 'clickable-row' : undefined}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter') onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
                    ))}
                    {rowActions ? (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="cluster">{rowActions(row)}</div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="페이지네이션">
            <button
              type="button"
              className="page-btn"
              aria-label="이전 페이지"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span className="current" aria-current="page">
              {page}
            </span>
            <span style={{ padding: '0 0.35rem', color: 'var(--ds-fg-subtle)', fontSize: 'var(--ds-text-sm)' }}>
              / {totalPages}
            </span>
            <button
              type="button"
              className="page-btn"
              aria-label="다음 페이지"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </nav>
          <p className="pagination-meta">
            페이지당 {PAGE_SIZE}건 · 총 {total}건
          </p>
        </>
      )}

      {drawer}
    </main>
  );
}
