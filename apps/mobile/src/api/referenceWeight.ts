import { apiFetch } from '../api';
import type { Goal } from './profile';
import type { WarningCode } from './profile';

export type ReferenceWeightResponse = {
  bmiMin: number;
  bmiMax: number;
  weightKgMin: number;
  weightKgMax: number;
  currentWeightKg: number | null;
  currentBmi: number | null;
  suggestedGoal: Goal | null;
  disclaimer: string;
  warnings: WarningCode[];
};

export async function fetchReferenceWeight(
  token: string,
  preview?: { heightCm: number; age: number; weightKg?: number },
): Promise<ReferenceWeightResponse> {
  const params = new URLSearchParams();
  if (preview) {
    params.set('heightCm', String(preview.heightCm));
    params.set('age', String(preview.age));
    if (preview.weightKg != null) params.set('weightKg', String(preview.weightKg));
  }
  const q = params.toString();
  return apiFetch<ReferenceWeightResponse>(`/me/reference-weight${q ? `?${q}` : ''}`, { token });
}
