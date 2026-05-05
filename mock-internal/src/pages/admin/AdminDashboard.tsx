import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

export function AdminDashboard() {
  const [ui, setUi] = useState<UiState>('default');
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>ADM_DASH</h2>
      <StatePicker value={ui} onChange={setUi} omit={['empty', 'complete', 'denied']} />
      {ui === 'loading' && (
        <div className="row">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ flex: 1, minWidth: 140 }}>
              <div className="skel" style={{ width: '70%' }} />
              <div className="skel" style={{ width: '40%', marginTop: 12 }} />
            </div>
          ))}
        </div>
      )}
      {ui === 'default' && (
        <>
          <div className="row">
            {[
              ['신규 가입', '128'],
              ['활성 사용자', '3.4k'],
              ['기록 건수', '41k'],
              ['미처리 문의', '12'],
            ].map(([t, v]) => (
              <div key={t} className="card" style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12, borderColor: 'var(--warn-fg)' }}>
            <div className="banner banner-warn" style={{ marginBottom: 8 }}>
              통계 배치 지연 · 일부 테넌시 staleHours &gt; 6h (알림 조건 데모)
            </div>
            <button type="button" className="btn btn-primary">
              최신값 반영 (POST /admin/stats/reaggregate 데모)
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 8 }}>
              목업: 실제 호출 없음. 비활성 처리 가능 패턴은 별도 화면과 동일합니다.
            </p>
          </div>
        </>
      )}
      {ui === 'error' && (
        <div className="banner banner-danger">
          대시보드를 불러오지 못했습니다. <button className="btn btn-ghost">재시도</button>
        </div>
      )}
    </div>
  );
}
