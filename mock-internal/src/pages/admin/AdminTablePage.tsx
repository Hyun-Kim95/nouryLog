import { useMemo, useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

type Kind = 'members' | 'foods' | 'inquiries' | 'notices';

const TITLES: Record<Kind, string> = {
  members: 'ADM_MEMBERS',
  foods: 'ADM_FOODS',
  inquiries: 'ADM_INQUIRIES',
  notices: 'ADM_NOTICES',
};

function makeRows(kind: Kind, page: number) {
  const base = (page - 1) * 15;
  return Array.from({ length: 15 }, (_, i) => {
    const n = base + i + 1;
    if (kind === 'members')
      return { c1: `user_${n}`, c2: n % 4 === 0 ? '비활성' : '활성', c3: '2026-05-01' };
    if (kind === 'foods') return { c1: `food_${n}`, c2: n % 5 === 0 ? '비활성' : '활성', c3: '템플릿' };
    if (kind === 'inquiries')
      return { c1: `#${1000 + n}`, c2: n % 3 === 0 ? '완료' : '처리중', c3: '2026-05-04' };
    return { c1: `공지 ${n}`, c2: n % 6 === 0 ? '비활성' : '게시', c3: '2026-05-03' };
  });
}

export function AdminTablePage({ kind }: { kind: Kind }) {
  const [ui, setUi] = useState<UiState>('default');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => makeRows(kind, page), [kind, page]);

  const resetFilters = () => {
    setQ('');
    setStatus('all');
    setPage(1);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{TITLES[kind]}</h2>
      <StatePicker value={ui} onChange={setUi} omit={['complete']} />

      <div className="filter-bar">
        <label>
          검색
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="키워드" />
        </label>
        <label>
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </label>
        <label>
          기간 시작
          <input type="date" />
        </label>
        <label>
          기간 종료
          <input type="date" />
        </label>
        <button type="button" className="btn btn-primary">
          검색
        </button>
        <button type="button" className="btn" onClick={resetFilters}>
          초기화
        </button>
      </div>
      <label className="row" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <input type="checkbox" /> 비활성 포함
      </label>

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '100%', height: 200 }} />
        </div>
      )}

      {ui === 'default' && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>이름/ID</th>
                  <th>상태</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    <td>
                      {r.c1}
                      {q ? ` · "${q}"` : ''}
                    </td>
                    <td>{r.c2}</td>
                    <td>{r.c3}</td>
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
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                className={p === page ? 'current' : 'btn'}
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn"
              aria-label="다음 페이지"
              disabled={page >= 3}
              onClick={() => setPage((p) => Math.min(3, p + 1))}
            >
              &gt;
            </button>
          </nav>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
            페이지당 15건 · 필터 상태 유지 데모
          </p>
        </>
      )}

      {ui === 'empty' && <div className="banner banner-info">조건에 맞는 결과가 없습니다. 검색 조건을 유지했습니다.</div>}

      {ui === 'error' && (
        <div className="banner banner-danger">
          목록을 불러오지 못했습니다. <button className="btn btn-ghost">재시도</button>
        </div>
      )}

      {ui === 'denied' && <div className="banner banner-danger">403 · 접근 권한이 없습니다.</div>}
    </div>
  );
}
