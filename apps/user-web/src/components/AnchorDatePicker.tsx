import { useEffect, useState } from 'react';
import { KstMonthCalendar } from './KstMonthCalendar';
import { todayAnchorKst } from '../lib/statsPeriod';

type Props = {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  maxDate?: string;
};

export function AnchorDatePicker({ label, value, onChange, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(value);
  const max = maxDate ?? todayAnchorKst();

  useEffect(() => {
    if (open) setPicked(value);
  }, [open, value]);

  const handleSelect = (ymd: string) => {
    if (ymd > max) return;
    setPicked(ymd);
    onChange(ymd);
    setOpen(false);
  };

  return (
    <>
      <label className="anchor-field">
        {label}
        <button type="button" className="input anchor-date-trigger" onClick={() => setOpen(true)}>
          {value}
        </button>
      </label>
      {open ? (
        <div
          className="calendar-modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="calendar-modal-sheet card"
            role="dialog"
            aria-label={`${label} 선택`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-modal-head">
              <strong>{label}</strong>
              <button type="button" className="btn-ghost btn-compact" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>
            <KstMonthCalendar selectedYmd={picked} onSelectYmd={handleSelect} maxDate={max} />
          </div>
        </div>
      ) : null}
    </>
  );
}
