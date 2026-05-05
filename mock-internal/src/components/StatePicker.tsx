import type { UiState } from '../types';

const LABELS: Record<UiState, string> = {
  default: '기본',
  loading: '로딩',
  empty: '빈 데이터',
  error: '오류',
  denied: '권한 제한',
  complete: '완료',
};

type Props = {
  value: UiState;
  onChange: (v: UiState) => void;
  /** 화면별로 일부 상태 숨김 */
  omit?: UiState[];
};

export function StatePicker({ value, onChange, omit = [] }: Props) {
  const options = (Object.keys(LABELS) as UiState[]).filter((k) => !omit.includes(k));
  return (
    <label className="row" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
      <span style={{ color: 'var(--muted)' }}>상태 UI</span>
      <select value={value} onChange={(e) => onChange(e.target.value as UiState)}>
        {options.map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}
