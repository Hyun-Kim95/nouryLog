import { API_BASE } from '../config';
import { handleAuthFailure } from '../authSession';
import { isAuthDenied } from '../lib/apiError';

export { isAuthDenied };

export type Gender = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'lose' | 'maintain' | 'gain';

export type ProfileInput = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel?: ActivityLevel | null;
  goal?: Goal | null;
  proteinGoalG?: number;
  calorieGoalKcal?: number;
  carbohydrateGoalG?: number;
  fatGoalG?: number;
};

export type AgeBand = 'teen' | 'adult' | 'older';
export type CalorieMode = 'maintain' | 'deficit' | 'surplus' | 'maintain_with_caution';
export type WarningCode =
  | 'teen_caution'
  | 'older_adult_caution'
  | 'low_calorie_floor_applied'
  | 'general_medical_caution';

export type RecommendationPolicy = {
  ageBand: AgeBand;
  proteinPerKg: number;
  calorieMode: CalorieMode;
  calorieDeltaKcal: number;
  carbohydrateRatio: number;
  fatRatio: number;
  carbohydrateMinG: number;
  fatMinPerKg: number;
};

export type RecommendationMeta = {
  recommendationVersion?: '1.4' | string;
  policy?: RecommendationPolicy;
  warnings?: WarningCode[];
};

export type GoalRangeFields = {
  proteinGoalMinG?: number;
  proteinGoalMaxG?: number;
  calorieGoalMinKcal?: number;
  calorieGoalMaxKcal?: number;
  carbohydrateGoalMinG?: number;
  carbohydrateGoalMaxG?: number;
  fatGoalMinG?: number;
  fatGoalMaxG?: number;
};

export type ProfileGetResponse = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  proteinGoalG?: number;
  calorieGoalKcal?: number;
  carbohydrateGoalG?: number;
  fatGoalG?: number;
} & GoalRangeFields &
  RecommendationMeta;

export type RecommendationResult = {
  proteinGoalG: number;
  calorieGoalKcal: number;
  carbohydrateGoalG: number;
  fatGoalG: number;
} & GoalRangeFields &
  RecommendationMeta;

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: ({ field?: string; allowedMin?: number; allowedMax?: number } & Record<string, unknown>) | null;
};

export class ProfileApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly field: string | null;
  readonly details: Record<string, unknown> | null;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `HTTP ${status}`);
    this.name = 'ProfileApiError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.field = (body.details?.field as string | undefined) ?? null;
    this.details = body.details ?? null;
  }
}

async function request<T>(
  path: string,
  init: { token: string; method: 'GET' | 'PUT' | 'POST'; body?: object; signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${init.token}`,
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    signal: init.signal,
  });
  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }
  if (!res.ok) {
    const err = new ProfileApiError(res.status, (json ?? {}) as ApiErrorBody);
    handleAuthFailure(err);
    throw err;
  }
  return json as T;
}

export type ApiCallOptions = {
  /** dev 빌드 한정 강제 5xx 시뮬레이션 (DevPanel에서 토글). prod에서는 무시한다. */
  __forceFail?: boolean;
};

function maybeForceFail(opts: ApiCallOptions | undefined, label: string): void {
  if (opts?.__forceFail && typeof __DEV__ !== 'undefined' && __DEV__) {
    throw new ProfileApiError(500, {
      code: 'FORCED_5XX',
      message: `[dev] ${label} 강제 실패 (DevPanel)`,
      details: null,
    });
  }
}

export async function getProfile(
  token: string,
  opts?: { signal?: AbortSignal },
): Promise<ProfileGetResponse> {
  return request<ProfileGetResponse>('/me/profile', { token, method: 'GET', signal: opts?.signal });
}

export type SaveProfileInput = Partial<ProfileInput>;

/**
 * `undefined` 키는 본문에서 제외한다(=변경 없음).
 * `null` 키는 본문에 포함되어 서버에서 명시적 NULL clear 신호로 해석된다(activityLevel/goal만 nullable).
 */
export async function saveProfile(
  token: string,
  input: SaveProfileInput,
  opts?: ApiCallOptions,
): Promise<{ ok: true }> {
  maybeForceFail(opts, 'saveProfile');
  const body: Record<string, unknown> = {};
  if (input.gender !== undefined) body.gender = input.gender;
  if (input.age !== undefined) body.age = input.age;
  if (input.heightCm !== undefined) body.heightCm = input.heightCm;
  if (input.weightKg !== undefined) body.weightKg = input.weightKg;
  if (input.activityLevel !== undefined) body.activityLevel = input.activityLevel;
  if (input.goal !== undefined) body.goal = input.goal;
  if (input.proteinGoalG !== undefined) body.proteinGoalG = input.proteinGoalG;
  if (input.calorieGoalKcal !== undefined) body.calorieGoalKcal = input.calorieGoalKcal;
  if (input.carbohydrateGoalG !== undefined) body.carbohydrateGoalG = input.carbohydrateGoalG;
  if (input.fatGoalG !== undefined) body.fatGoalG = input.fatGoalG;
  return request<{ ok: true }>('/me/profile', { token, method: 'PUT', body });
}

export async function recalcRecommendation(
  token: string,
  opts?: ApiCallOptions,
): Promise<RecommendationResult> {
  maybeForceFail(opts, 'recalcRecommendation');
  return request<RecommendationResult>('/me/recommendation/recalculate', {
    token,
    method: 'POST',
    body: {},
  });
}

