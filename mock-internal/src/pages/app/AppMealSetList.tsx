import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

const SETS = [
  { name: '아침 기본 세트', slot: '아침', items: 3, kcal: 520 },
  { name: '운동 후 단백질', slot: '간식 · 저녁 후', items: 2, kcal: 310 },
  { name: '점심 도시락', slot: '점심', items: 4, kcal: 740 },
];

export function AppMealSetList() {
  const [ui, setUi] = useState<UiState>('default');

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_MEAL_SET_LIST · 안 A</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 0 }}>
        진입: 기록(Log) 화면 → "세트로 등록"
      </p>
      <StatePicker value={ui} onChange={setUi} omit={['complete']} />

      <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }}>
        + 새 세트 만들기
      </button>

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '50%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
        </div>
      )}

      {ui === 'error' && (
        <div className="banner banner-danger">
          세트를 불러오지 못했어요. <button className="btn btn-ghost">재시도</button>
        </div>
      )}

      {ui === 'denied' && (
        <div className="banner banner-info">로그인이 필요해요. 로그인 화면으로 이동합니다.</div>
      )}

      {ui === 'empty' && (
        <div className="card">
          <p style={{ marginTop: 0 }}>아직 만든 세트가 없어요.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            자주 먹는 음식을 끼니별로 묶어두면 한 번에 기록할 수 있어요.
          </p>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }}>
            첫 세트 만들기
          </button>
        </div>
      )}

      {ui === 'default' &&
        SETS.map((s) => (
          <div key={s.name} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{s.name}</strong>
              <span className="badge">{s.slot}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0.35rem 0 0.6rem' }}>
              {s.items}개 항목 · 약 {s.kcal} kcal
            </div>
            <div className="row">
              <button type="button" className="btn btn-primary" style={{ flex: 1 }}>
                한 번에 등록
              </button>
              <button type="button" className="btn">
                편집
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
