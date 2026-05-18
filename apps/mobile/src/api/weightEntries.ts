import { apiFetch } from '../api';

export type GoalSnapshot = {
  goal: string | null;
  proteinGoalG: number | null;
  calorieGoalKcal: number | null;
  proteinGoalMinG: number | null;
  proteinGoalMaxG: number | null;
  calorieGoalMinKcal: number | null;
  calorieGoalMaxKcal: number | null;
};

export type WeightCheckInStatus = {
  due: boolean;
  lastRecordedAt: string | null;
  lastWeightKg: number | null;
  daysSince: number | null;
};

export type WeightEntryPostResponse = {
  entry: { id: string; recordedAt: string; weightKg: number };
  goalsBefore: GoalSnapshot;
  goalsAfter: GoalSnapshot;
};

export async function getWeightCheckInStatus(token: string): Promise<WeightCheckInStatus> {
  return apiFetch<WeightCheckInStatus>('/me/weight-entries/status', { token });
}

export async function postWeightEntry(token: string, weightKg: number): Promise<WeightEntryPostResponse> {
  return apiFetch<WeightEntryPostResponse>('/me/weight-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({ weightKg }),
  });
}
