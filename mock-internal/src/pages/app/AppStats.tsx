import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

export function AppStats() {
  const [ui, setUi] = useState<UiState>('default');
  const [stale, setStale] = useState(true);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_STATS</h2>
      <StatePicker value={ui} onChange={setUi} omit={['complete', 'denied']} />
      <label className="row" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--muted)' }}>stale 데모</span>
        <select value={stale ? 'yes' : 'no'} onChange={(e) => setStale(e.target.value === 'yes')}>
          <option value="yes">isStale=true · staleHours=7</option>
          <option value="no">isStale=false</option>
        </select>
      </label>

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '50%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 16 }} />
        </div>
      )}

      {ui === 'default' && (
        <>
          {stale && (
            <div className="banner banner-warn">
              최신 반영 지연 · 마지막 배치 2026-05-05 03:00 (staleHours 7, 운영 기준 6h 초과 UI)
            </div>
          )}
          <div className="card">
            <div className="row">
              <button type="button" className="btn btn-primary">
                하루
              </button>
              <button type="button" className="btn">
                주
              </button>
              <button type="button" className="btn">
                월
              </button>
            </div>
            <p style={{ marginTop: 12 }}>
              권장 대비 달성률 <strong>78%</strong>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>타임존 경계·일 배치 기준 표시 영역</p>
          </div>
        </>
      )}

      {ui === 'empty' && (
        <div className="card">
          <p>선택한 기간에 기록이 없습니다.</p>
          <button type="button" className="btn btn-primary">
            기록 추가
          </button>
        </div>
      )}

      {ui === 'error' && (
        <div className="banner banner-danger">
          통계를 불러오지 못했습니다. <button className="btn btn-ghost">재시도</button>
        </div>
      )}
    </div>
  );
}
