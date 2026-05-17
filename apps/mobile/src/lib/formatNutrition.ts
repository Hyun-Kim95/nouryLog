export type MacroValues = {
  protein: number;
  carbohydrate: number;
  fat: number;
};

/** 기록 목록·칩용 한 줄 매크로 표기 */
export function formatMacroLine({ protein, carbohydrate, fat }: MacroValues): string {
  return `단백질 ${Math.round(protein)}g · 탄수 ${Math.round(carbohydrate)}g · 지방 ${Math.round(fat)}g`;
}

export function formatGoalRange(min: number | null | undefined, max: number | null | undefined, unit: string): string {
  if (min != null && max != null) return `${min.toLocaleString()}–${max.toLocaleString()}${unit}`;
  if (max != null) return `${max.toLocaleString()}${unit}`;
  return '—';
}
