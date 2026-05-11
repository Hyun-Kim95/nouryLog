const LABEL_MAX = 20;

export const PORTION_UNIT_VALUES = ['GRAM', 'PIECE', 'PLATE', 'BOWL', 'CUSTOM'] as const;
export type PortionUnitValue = (typeof PORTION_UNIT_VALUES)[number];

const UNIT_SET = new Set<string>(PORTION_UNIT_VALUES);

export function resolvePortionUnit(
  input: unknown,
): { ok: true; unit: PortionUnitValue } | { ok: false; message: string; field: string } {
  if (input === undefined || input === null || input === '') return { ok: true, unit: 'GRAM' };
  const s = String(input).trim();
  if (!UNIT_SET.has(s)) {
    return { ok: false, message: 'portionUnit 값이 올바르지 않습니다.', field: 'portionUnit' };
  }
  return { ok: true, unit: s as PortionUnitValue };
}

export function normalizePortionLabel(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  const s = String(input).trim();
  if (!s) return null;
  return s.slice(0, LABEL_MAX);
}

export type PortionLabelResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string; field: string };

export function validatePortionLabelForUnit(unit: PortionUnitValue, label: string | null): PortionLabelResult {
  if (unit === 'CUSTOM') {
    if (!label) {
      return { ok: false, message: 'CUSTOM 단위일 때 portionLabel이 필요합니다.', field: 'portionLabel' };
    }
    return { ok: true, value: label };
  }
  return { ok: true, value: label };
}
