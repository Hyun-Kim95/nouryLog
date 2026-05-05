import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

type QuotaDemo = '4banner' | '5paywall' | 'normal';

export function AppLog() {
  const [ui, setUi] = useState<UiState>('default');
  const [quota, setQuota] = useState<QuotaDemo>('normal');
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_LOG_OCR</h2>
      <StatePicker value={ui} onChange={setUi} omit={['denied']} />
      <label className="row" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--muted)' }}>OCR 데모</span>
        <select
          value={quota}
          onChange={(e) => {
            setQuota(e.target.value as QuotaDemo);
            setShowPaywall(false);
          }}
        >
          <option value="normal">무료 여유 (4회 미만)</option>
          <option value="4banner">4회 사용 — 사전 배너</option>
          <option value="5paywall">5회 소진 — 페이월</option>
        </select>
      </label>

      {quota === '4banner' && ui === 'default' && (
        <div className="banner banner-warn">
          무료 OCR 1회 남았어요. 프리미엄으로 무제한 OCR과 광고 제거를 이용해보세요.
        </div>
      )}

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '70%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12, height: 120 }} />
        </div>
      )}

      {ui === 'default' && (
        <div className="card">
          <div className="row">
            <button type="button" className="btn btn-primary">
              사진 OCR
            </button>
            <button type="button" className="btn">
              수동 입력
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            OCR 실행 전 결제 검사 · SKU <code>premium_monthly</code>
          </p>
          {quota === '5paywall' && (
            <button type="button" className="btn btn-primary" onClick={() => setShowPaywall(true)}>
              OCR 실행 (페이월 데모)
            </button>
          )}
        </div>
      )}

      {ui === 'empty' && (
        <div className="card">
          <p>저장된 초안이 없습니다.</p>
        </div>
      )}

      {ui === 'error' && (
        <div className="banner banner-danger">
          OCR 제공자 오류. 수동 입력으로 전환하거나 잠시 후 재시도하세요.
        </div>
      )}

      {ui === 'complete' && (
        <div className="banner banner-info">저장되었습니다. 기록 상세로 이동합니다.</div>
      )}

      {showPaywall && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>프리미엄 안내</h3>
            <p>무료 OCR 5회를 모두 사용했어요. 프리미엄 구독으로 OCR을 계속 이용하고 광고를 제거할 수 있어요.</p>
            <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
              premium_monthly 결제
            </button>
            <button type="button" className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowPaywall(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
