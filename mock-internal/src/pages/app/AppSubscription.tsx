import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

export function AppSubscription() {
  const [ui, setUi] = useState<UiState>('default');
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_SUB_SETTINGS</h2>
      <StatePicker value={ui} onChange={setUi} omit={['empty', 'complete', 'denied']} />
      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '55%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
        </div>
      )}
      {ui === 'default' && (
        <div className="card">
          <p className="badge">무료 플랜</p>
          <ul style={{ paddingLeft: '1.1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            <li>OCR 무료 5회 (누적)</li>
            <li>하단 광고 노출</li>
          </ul>
          <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
            premium_monthly 구독 (월 4,900원)
          </button>
          <button type="button" className="btn" style={{ width: '100%', marginTop: 8 }}>
            구매 복구 (restore)
          </button>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 12 }}>
            프리미엄: OCR 추가 사용 + 광고 제거 동시 제공 (단일 SKU)
          </p>
        </div>
      )}
      {ui === 'error' && (
        <div className="banner banner-danger">
          결제 상태를 확인하지 못했습니다. <button className="btn btn-ghost">재시도</button>
        </div>
      )}
    </div>
  );
}
