import { addDaysYmd, todayAnchorKst } from './statsPeriod';

export function kstIsoRangeForDays(dayCount: number): { from: string; to: string } {
  const endYmd = todayAnchorKst();
  const startYmd = addDaysYmd(endYmd, -(dayCount - 1));
  return {
    from: `${startYmd}T00:00:00+09:00`,
    to: `${endYmd}T23:59:59.999+09:00`,
  };
}

export function formatKstDateLabel(ymd?: string): string {
  const anchor = ymd ?? todayAnchorKst();
  const [, m, d] = anchor.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

export function formatConsumedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
