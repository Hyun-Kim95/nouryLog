import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

export function AppHome() {
  const [ui, setUi] = useState<UiState>('default');
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_HOME</h2>
      <StatePicker value={ui} onChange={setUi} omit={['complete', 'denied']} />
      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '40%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
          <div className="skel" style={{ width: '90%', marginTop: 8 }} />
        </div>
      )}
      {ui === 'default' && (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>오늘 요약</strong>
              <span className="badge">OCR 무료 3/5</span>
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              타임존: Asia/Seoul · 집계 기준 00:00
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <div className="card" style={{ flex: 1, margin: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>칼로리</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>1,842 / 2,000</div>
              </div>
              <div className="card" style={{ flex: 1, margin: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>단백질</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>82 / 110g</div>
              </div>
            </div>
          </div>
          <div className="banner banner-info">하단 배너 광고 영역 (무료 플랜)</div>
        </>
      )}
      {ui === 'empty' && (
        <div className="card">
          <p>아직 오늘 기록이 없습니다.</p>
          <button type="button" className="btn btn-primary">
            기록 추가
          </button>
        </div>
      )}
      {ui === 'error' && (
        <div className="banner banner-danger">
          홈 요약을 불러오지 못했습니다. <button className="btn btn-ghost">재시도</button>
        </div>
      )}
    </div>
  );
}
