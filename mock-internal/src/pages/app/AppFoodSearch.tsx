import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

type Preset = '30' | '90' | 'all';

const PRESET_LABEL: Record<Preset, string> = {
  '30': '30일',
  '90': '90일',
  all: '전체',
};

const RECENT_CHIPS = ['신라면', '닭가슴살', '바나나', '아메리카노', '계란', '고구마'];

const HISTORY = [
  { date: '6/20 (목)', slot: '점심', name: '신라면', kcal: 480 },
  { date: '6/18 (화)', slot: '간식 · 점심·저녁 사이', name: '신라면', kcal: 480 },
  { date: '6/12 (수)', slot: '저녁', name: '신라면', kcal: 480 },
  { date: '6/9 (일)', slot: '간식 · 저녁 후', name: '신라면', kcal: 480 },
  { date: '6/3 (화)', slot: '점심', name: '신라면', kcal: 480 },
];

export function AppFoodSearch() {
  const [ui, setUi] = useState<UiState>('default');
  const [query, setQuery] = useState('신라면');
  const [preset, setPreset] = useState<Preset>('90');
  const [showSuggest, setShowSuggest] = useState(false);

  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_FOOD_SEARCH · 안 A</h2>
      <StatePicker value={ui} onChange={setUi} omit={['complete']} />

      {/* 검색 입력 + 자동완성 */}
      <div className="card" style={{ position: 'relative' }}>
        <label className="row" style={{ width: '100%' }}>
          <input
            value={query}
            placeholder="음식명 검색"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
            style={{
              flex: 1,
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
        </label>
        {showSuggest && hasQuery && (
          <div
            className="card"
            style={{ position: 'absolute', left: 12, right: 12, top: '3.2rem', zIndex: 5, padding: 4 }}
          >
            {['신라면', '신라면 블랙', '진라면 매운맛'].map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none' }}
                onMouseDown={() => setQuery(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 기간 프리셋 */}
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        {(['30', '90', 'all'] as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${preset === p ? 'btn-primary' : ''}`}
            onClick={() => setPreset(p)}
          >
            {PRESET_LABEL[p]}
          </button>
        ))}
      </div>

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '60%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 16 }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
        </div>
      )}

      {ui === 'error' && (
        <div className="banner banner-danger">
          검색에 실패했어요. <button className="btn btn-ghost">재시도</button>
        </div>
      )}

      {ui === 'denied' && (
        <div className="banner banner-info">
          로그인이 필요해요. 로그인 화면으로 이동합니다.
        </div>
      )}

      {/* 검색어 없음 → 안내 + 최근 음식 칩 */}
      {ui === 'default' && !hasQuery && (
        <div className="card">
          <p style={{ marginTop: 0, color: 'var(--muted)' }}>음식명을 검색해 보세요.</p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>최근 먹은 음식</p>
          <div className="row">
            {RECENT_CHIPS.map((c) => (
              <button key={c} type="button" className="badge" onClick={() => setQuery(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 빈 결과 */}
      {ui === 'empty' && hasQuery && (
        <div className="card">
          <p style={{ marginTop: 0 }}>이 기간에 "{query}" 기록이 없어요.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>이 기간 0번</p>
        </div>
      )}

      {/* 기본 결과 */}
      {ui === 'default' && hasQuery && (
        <>
          <div className="card">
            <p style={{ marginTop: 0, fontSize: '1.05rem' }}>
              이 기간 동안 <strong>12번</strong> 먹었어요
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0.25rem 0' }}>
              마지막 섭취: 3일 전 (6/20 점심)
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
              주로 간식으로 7번 · 저녁 3번 · 아침 2번
            </p>
          </div>

          <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.5rem 0' }}>섭취 이력</p>
          {HISTORY.map((h, i) => (
            <button
              key={i}
              type="button"
              className="card"
              style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{h.date}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{h.kcal} kcal</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
                {h.slot} · {h.name}
              </div>
            </button>
          ))}
          <div className="pagination">
            <button type="button" className="btn btn-ghost">
              ‹
            </button>
            <span className="current">1</span>
            <button type="button" className="btn btn-ghost">
              2
            </button>
            <button type="button" className="btn btn-ghost">
              ›
            </button>
          </div>
        </>
      )}
    </div>
  );
}
