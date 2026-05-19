import type { WarningCode } from './recommendation.js';

export const REFERENCE_BMI_MIN = 18.5;
export const REFERENCE_BMI_MAX = 23;

const TEEN_AGE_MAX = 18;
const OLDER_AGE_MIN = 65;

const HEIGHT_MIN = 100;
const HEIGHT_MAX = 250;

export type SuggestedGoal = 'lose' | 'maintain' | 'gain';

export type ReferenceWeightInput = {
  heightCm: number;
  age: number;
  weightKg?: number | null;
};

export type ReferenceWeightResult = {
  bmiMin: number;
  bmiMax: number;
  weightKgMin: number;
  weightKgMax: number;
  currentWeightKg: number | null;
  currentBmi: number | null;
  suggestedGoal: SuggestedGoal | null;
  disclaimer: string;
  warnings: WarningCode[];
};

export const REFERENCE_WEIGHT_DISCLAIMER =
  '참고·추정 값입니다. 질환, 임신·수유, 청소년 성장기, 고령·근감소 위험, 전문 운동 목표가 있으면 전문가와 상담하세요.';

function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

export function bmiFromKgHeight(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (heightM <= 0) return 0;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function weightRangeFromHeightCm(heightCm: number): { weightKgMin: number; weightKgMax: number } {
  const heightM = heightCm / 100;
  const weightKgMin = roundKg(REFERENCE_BMI_MIN * heightM * heightM);
  const weightKgMax = roundKg(REFERENCE_BMI_MAX * heightM * heightM);
  return { weightKgMin, weightKgMax };
}

export function suggestGoalFromWeight(
  weightKg: number,
  weightKgMin: number,
  weightKgMax: number,
): SuggestedGoal {
  if (weightKg > weightKgMax) return 'lose';
  if (weightKg < weightKgMin) return 'gain';
  return 'maintain';
}

function warningsForAge(age: number): WarningCode[] {
  const out: WarningCode[] = [];
  if (age <= TEEN_AGE_MAX) out.push('teen_caution');
  if (age >= OLDER_AGE_MIN) out.push('older_adult_caution');
  return out;
}

export function computeReferenceWeight(input: ReferenceWeightInput): ReferenceWeightResult {
  const { weightKgMin, weightKgMax } = weightRangeFromHeightCm(input.heightCm);
  const currentWeightKg =
    input.weightKg != null && Number.isFinite(input.weightKg) ? roundKg(input.weightKg) : null;
  const currentBmi =
    currentWeightKg != null ? bmiFromKgHeight(currentWeightKg, input.heightCm) : null;
  const suggestedGoal =
    currentWeightKg != null ? suggestGoalFromWeight(currentWeightKg, weightKgMin, weightKgMax) : null;

  return {
    bmiMin: REFERENCE_BMI_MIN,
    bmiMax: REFERENCE_BMI_MAX,
    weightKgMin,
    weightKgMax,
    currentWeightKg,
    currentBmi,
    suggestedGoal,
    disclaimer: REFERENCE_WEIGHT_DISCLAIMER,
    warnings: warningsForAge(input.age),
  };
}

export function validateHeightForReference(heightCm: number): string | null {
  if (!Number.isFinite(heightCm) || heightCm < HEIGHT_MIN || heightCm > HEIGHT_MAX) {
    return `신장은 ${HEIGHT_MIN}~${HEIGHT_MAX}cm 범위여야 합니다.`;
  }
  return null;
}
