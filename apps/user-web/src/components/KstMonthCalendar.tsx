import { useMemo, useState } from 'react';
import { addMonthsYmd, monthStartYmd, todayAnchorKst } from '../lib/statsPeriod';

type Props = {
  selectedYmd: string;
  onSelectYmd: (ymd: string) => void;
  maxDate?: string;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseYm(ymd: string): { y: number; m: number } {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  return { y, m };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatCell(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function KstMonthCalendar({ selectedYmd, onSelectYmd, maxDate }: Props) {
  const max = maxDate ?? todayAnchorKst();
  const [viewYm, setViewYm] = useState(() => selectedYmd.slice(0, 7));

  const { y, m } = parseYm(`${viewYm}-01`);
  const lastDay = daysInMonth(y, m);
  const startWeekday = weekdayOf(y, m, 1);

  const cells = useMemo(() => {
    const list: Array<{ ymd: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) list.push({ ymd: null, day: null });
    for (let d = 1; d <= lastDay; d++) {
      list.push({ ymd: formatCell(y, m, d), day: d });
    }
    return list;
  }, [y, m, lastDay, startWeekday]);

  const prevMonth = () => setViewYm(addMonthsYmd(monthStartYmd(`${viewYm}-01`), -1).slice(0, 7));
  const nextMonth = () => setViewYm(addMonthsYmd(monthStartYmd(`${viewYm}-01`), 1).slice(0, 7));

  const maxYm = max.slice(0, 7);
  const canNext = viewYm < maxYm;

  return (
    <div className="kst-calendar">
      <div className="kst-calendar-header">
        <button type="button" className="btn-ghost btn-icon" onClick={prevMonth} aria-label="이전 달">
          ‹
        </button>
        <span className="kst-calendar-title">
          {y}년 {m}월
        </span>
        <button
          type="button"
          className="btn-ghost btn-icon"
          onClick={nextMonth}
          disabled={!canNext}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>
      <div className="kst-calendar-weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="kst-calendar-weekday">
            {w}
          </span>
        ))}
      </div>
      <div className="kst-calendar-grid">
        {cells.map((cell, idx) => {
          if (!cell.ymd) return <span key={`e-${idx}`} className="kst-calendar-cell kst-calendar-cell--empty" />;
          const disabled = cell.ymd > max;
          const selected = cell.ymd === selectedYmd;
          return (
            <button
              key={cell.ymd}
              type="button"
              className={`kst-calendar-cell${selected ? ' kst-calendar-cell--selected' : ''}${disabled ? ' kst-calendar-cell--disabled' : ''}`}
              disabled={disabled}
              onClick={() => onSelectYmd(cell.ymd!)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
