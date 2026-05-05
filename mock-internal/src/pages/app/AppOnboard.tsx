import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

export function AppOnboard() {
  const [ui, setUi] = useState<UiState>('default');
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_ONBOARD</h2>
      <StatePicker value={ui} onChange={setUi} omit={['empty', 'complete']} />
      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '60%' }} />
          <div className="skel" style={{ width: '90%', marginTop: 8 }} />
          <div className="skel" style={{ width: '80%', marginTop: 8 }} />
        </div>
      )}
      {ui === 'default' && (
        <div className="card">
          <p className="badge">로그인 / 회원가입</p>
          <label style={{ display: 'block', marginTop: 8 }}>
            이메일
            <input type="email" style={{ width: '100%', marginTop: 4 }} placeholder="you@example.com" />
          </label>
          <label style={{ display: 'block', marginTop: 8 }}>
            비밀번호
            <input type="password" style={{ width: '100%', marginTop: 4 }} />
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary">
              계속
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 12 }}>
            프로필(성별·나이·신장·체중·활동량·목표) 입력 단계는 동일 화면 흐름으로 간주합니다.
          </p>
        </div>
      )}
      {ui === 'error' && (
        <div className="banner banner-danger">입력값을 확인해 주세요. 네트워크 오류 시 재시도할 수 있습니다.</div>
      )}
      {ui === 'denied' && (
        <div className="banner banner-danger">세션이 만료되었습니다. 다시 로그인해 주세요.</div>
      )}
    </div>
  );
}
