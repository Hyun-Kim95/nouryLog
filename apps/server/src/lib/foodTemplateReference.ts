/** DB `referenceAmount`가 없거나(구 데이터) 비정상일 때 기본값·역산 */
export function resolvedReferenceAmount(f: {
  referenceAmount?: number | null;
  portionUnit: string;
  servingGrams: number | null;
}): number {
  if (f.referenceAmount != null && Number.isFinite(f.referenceAmount) && f.referenceAmount > 0) {
    return f.referenceAmount;
  }
  if (f.portionUnit === 'GRAM' && f.servingGrams != null && f.servingGrams > 0) {
    return f.servingGrams;
  }
  return 1;
}
