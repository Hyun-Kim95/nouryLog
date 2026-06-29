import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

const SLOTS = ['아침', '점심', '저녁', '간식'] as const;
type Slot = (typeof SLOTS)[number];

const SNACK_PLACEMENTS = ['아침 전', '아침·점심 사이', '점심·저녁 사이', '저녁 후'];

type Item = { name: string; portion: string; kcal: number; inactive?: boolean };

const ITEMS: Item[] = [
  { name: '삶은 계란', portion: '2개', kcal: 156 },
  { name: '통밀 토스트', portion: '1장', kcal: 130 },
  { name: '저지방 우유', portion: '200ml', kcal: 92, inactive: true },
];

export function AppMealSetEditor() {
  const [ui, setUi] = useState<UiState>('default');
  const [name, setName] = useState('아침 기본 세트');
  const [slot, setSlot] = useState<Slot>('아침');
  const [showAdd, setShowAdd] = useState(false);

  const emptyName = name.trim().length === 0;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_MEAL_SET_EDITOR · 안 A</h2>
      <StatePicker value={ui} onChange={setUi} omit={['empty']} />

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '40%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
        </div>
      )}

      {ui === 'error' && (
        <div className="banner banner-danger">
          저장에 실패했어요. 잠시 후 재시도하세요.
        </div>
      )}

      {ui === 'denied' && (
        <div className="banner banner-info">로그인이 필요해요.</div>
      )}

      {(ui === 'default' || ui === 'complete') && (
        <>
          {ui === 'complete' && <div className="banner banner-info">세트를 저장했어요.</div>}

          {/* 이름 */}
          <div className="card">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>
              세트 이름
              <input
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '0.5rem 0.65rem',
                  borderRadius: 8,
                  border: `1px solid ${emptyName ? 'var(--danger-fg)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </label>
            {emptyName && (
              <p style={{ color: 'var(--danger-fg)', fontSize: '0.8rem', margin: '4px 0 0' }}>
                세트 이름을 입력해 주세요. (1~40자)
              </p>
            )}
          </div>

          {/* 기본 끼니 */}
          <div className="card">
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>기본 끼니</p>
            <div className="row">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${slot === s ? 'btn-primary' : ''}`}
                  onClick={() => setSlot(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {slot === '간식' && (
              <label className="row" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted)' }}>간식 위치</span>
                <select>
                  {SNACK_PLACEMENTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* 항목 목록 */}
          <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.5rem 0' }}>
            항목 ({ITEMS.length}/20)
          </p>
          {ITEMS.map((it) => (
            <div key={it.name} className="card" style={{ padding: '0.6rem 0.75rem' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{it.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                    {it.portion} · {it.kcal} kcal
                  </div>
                </div>
                <button type="button" className="btn btn-ghost">
                  ✕
                </button>
              </div>
              {it.inactive && (
                <div className="banner banner-warn" style={{ marginTop: 8, marginBottom: 0 }}>
                  이 음식은 더 이상 사용할 수 없어요. 교체하거나 삭제해 주세요.
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="btn"
            style={{ width: '100%', marginBottom: '0.75rem' }}
            onClick={() => setShowAdd(true)}
          >
            + 항목 추가 (음식 검색)
          </button>

          <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={emptyName}>
            세트 저장
          </button>
        </>
      )}

      {showAdd && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 style={{ marginTop: 0 }}>항목 추가</h3>
            <input
              placeholder="음식명 검색 (템플릿)"
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
            <div style={{ marginTop: 8 }}>
              {['닭가슴살', '현미밥', '바나나'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left' }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              MVP는 등록된 음식 템플릿만 추가할 수 있어요. (수동 입력은 후순위)
            </p>
            <button type="button" className="btn" style={{ width: '100%' }} onClick={() => setShowAdd(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
