import { useState } from 'react';
import { StatePicker } from '../../components/StatePicker';
import type { UiState } from '../../types';

const SLOTS = ['아침', '점심', '저녁', '간식'] as const;
type Slot = (typeof SLOTS)[number];

const ITEMS = [
  { name: '삶은 계란', portion: '2개', kcal: 156, unavailable: false },
  { name: '통밀 토스트', portion: '1장', kcal: 130, unavailable: false },
  { name: '저지방 우유', portion: '200ml', kcal: 92, unavailable: true },
];

export function AppMealSetApply() {
  const [ui, setUi] = useState<UiState>('default');
  const [slot, setSlot] = useState<Slot>('아침');
  const [date, setDate] = useState('2026-06-29');
  const [excludeUnavailable, setExcludeUnavailable] = useState(false);

  const hasUnavailable = ITEMS.some((i) => i.unavailable);
  const future = date > '2026-06-29';
  const included = ITEMS.filter((i) => !(excludeUnavailable && i.unavailable));
  const kcalSum = included.reduce((a, i) => a + i.kcal, 0);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>APP_MEAL_SET_APPLY · 안 A</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 0 }}>
        하단 시트(바텀시트) · "아침 기본 세트" 한 번에 등록
      </p>
      <StatePicker value={ui} onChange={setUi} omit={['empty']} />

      {ui === 'loading' && (
        <div className="card">
          <div className="skel" style={{ width: '60%' }} />
          <div className="skel" style={{ width: '100%', marginTop: 12 }} />
        </div>
      )}

      {ui === 'denied' && <div className="banner banner-info">로그인이 필요해요.</div>}

      {ui === 'error' && (
        <div className="banner banner-danger">
          등록에 실패했어요. <button className="btn btn-ghost">재시도</button>
          <p style={{ fontSize: '0.78rem', margin: '6px 0 0' }}>
            같은 요청 ID로 재시도해 중복 등록을 막아요.
          </p>
        </div>
      )}

      {ui === 'complete' && (
        <div className="banner banner-info">
          {included.length}건을 {slot}에 등록했어요. 기록 화면이 갱신됩니다.
        </div>
      )}

      {(ui === 'default' || ui === 'complete') && (
        <>
          {/* 대상 날짜/끼니 */}
          <div className="card">
            <label className="row" style={{ width: '100%', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--muted)', minWidth: 56 }}>날짜</span>
              <input
                type="date"
                value={date}
                max="2026-06-29"
                onChange={(e) => setDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.6rem',
                  borderRadius: 8,
                  border: `1px solid ${future ? 'var(--danger-fg)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </label>
            {future && (
              <p style={{ color: 'var(--danger-fg)', fontSize: '0.8rem', margin: '6px 0 0' }}>
                미래 날짜에는 등록할 수 없어요.
              </p>
            )}
            <p style={{ margin: '0.6rem 0 0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>끼니</p>
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
          </div>

          {/* 등록 불가 안내 (기본 CTA = 제외 후 등록) */}
          {hasUnavailable && !excludeUnavailable && (
            <div className="banner banner-warn">
              사용할 수 없는 음식 1개가 포함돼 있어요.
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setExcludeUnavailable(true)}
                >
                  문제 항목 제외 후 등록
                </button>
                <button type="button" className="btn btn-ghost">
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 미리보기 */}
          <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.5rem 0' }}>
            등록될 항목 ({included.length}) · 합계 {kcalSum} kcal
          </p>
          {ITEMS.map((it) => {
            const excluded = excludeUnavailable && it.unavailable;
            return (
              <div
                key={it.name}
                className="card"
                style={{ padding: '0.55rem 0.75rem', opacity: excluded ? 0.45 : 1 }}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>
                    {it.name}
                    {it.unavailable && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        {excluded ? '제외됨' : '사용 불가'}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {it.portion} · {it.kcal} kcal
                  </span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={future || (hasUnavailable && !excludeUnavailable) || included.length === 0}
          >
            {included.length}건 등록
          </button>
        </>
      )}
    </div>
  );
}
