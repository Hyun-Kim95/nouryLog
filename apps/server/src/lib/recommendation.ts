/**
 * 권장 칼로리·단백질 계산 (v1.4).
 *
 * SSOT
 *  - 정책 근거: docs/research/recommendation-v14-evidence.md
 *  - 결정 결과: docs/requirements/feature-recommendation-v14-prd.md v0.2 §5/§8
 *  - 디자인 매핑: docs/design/recommendation-v14-spec.md v0.1
 *
 * v1.4 변경점 요약 (v1.3 대비)
 *  - 청소년(`<19`): 자동 deficit/surplus 미적용. `calorieMode='maintain_with_caution'`. teen_caution 경고.
 *  - 고령(`65+`): 칼로리 delta clamp(150,300) + 단백질 최소 1.1 g/kg + older_adult_caution 경고.
 *  - 자동 칼로리 floor: male 1500 / female·unspecified 1200. 위반 시 floor로 끌어올리고 low_calorie_floor_applied 경고.
 *  - 자동 단백질 상한: 2.0 g/kg/day (자동 추천 한정).
 *  - calculateRecommendation은 기존 시그니처 유지(역호환). 메타까지 필요한 호출자는 calculateRecommendationFull을 사용.
 *
 * v1.3 호환
 *  - GOAL_CALORIE_FACTOR / GOAL_PROTEIN_PER_KG는 그대로 유지. 새 정책은 별도 변수 ADULT_CALORIE_DELTA / ADULT_PROTEIN_PER_KG로 표현.
 *
 * activityLevel/goal이 NULL이면 안전 기본값 `moderate`/`maintain`을 사용해 계산한다(v1.3 마이그레이션 정책 그대로).
 */

export type Gender = 'male' | 'female' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'lose' | 'maintain' | 'gain';

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const GOAL_CALORIE_FACTOR: Record<Goal, number> = {
  lose: 0.9,
  maintain: 1.0,
  gain: 1.1,
};

export const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 1.4,
  maintain: 1.0,
  gain: 1.6,
};

const DEFAULT_ACTIVITY: ActivityLevel = 'moderate';
const DEFAULT_GOAL: Goal = 'maintain';

const TEEN_AGE_MAX = 18;
const OLDER_AGE_MIN = 65;

const ADULT_CALORIE_DELTA: Record<Goal, number> = {
  lose: -300,
  maintain: 0,
  gain: 300,
};

const OLDER_DELTA_MIN_ABS = 150;
const OLDER_DELTA_MAX_ABS = 300;

const ADULT_PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 1.4,
  maintain: 1.0,
  gain: 1.6,
};

const OLDER_PROTEIN_MIN_PER_KG = 1.1;
const PROTEIN_AUTO_CAP_PER_KG = 2.0;

const CALORIE_FLOOR_BY_GENDER: Record<string, number> = {
  male: 1500,
  female: 1200,
  unspecified: 1200,
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
};

export type RecommendationMeta = {
  recommendationVersion: '1.4';
  policy: RecommendationPolicy;
  warnings: WarningCode[];
};

export type ProfileForRecommendation = {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel?: string | null;
  goal?: string | null;
};

export type RecommendationResult = {
  proteinGoalG: number;
  calorieGoalKcal: number;
};

export type RecommendationFull = RecommendationResult & RecommendationMeta;

export type GoalRange = {
  proteinGoalMinG: number;
  proteinGoalMaxG: number;
  calorieGoalMinKcal: number;
  calorieGoalMaxKcal: number;
};

const GOAL_CLAMP_MIN = 0;
const GOAL_CLAMP_MAX = 10000;

/**
 * 중심값·목표 유형으로 일일 권장 범위 산출 (mobile-log-ux PRD §6).
 */
export function computeGoalRanges(
  centerProteinG: number,
  centerCalorieKcal: number,
  goal: Goal,
): GoalRange {
  const proteinDelta = Math.max(5, Math.round(centerProteinG * 0.05));
  const proteinGoalMinG = Math.max(GOAL_CLAMP_MIN, centerProteinG - proteinDelta);
  const proteinGoalMaxG = Math.min(GOAL_CLAMP_MAX, centerProteinG + proteinDelta);

  let calorieGoalMinKcal: number;
  let calorieGoalMaxKcal: number;
  if (goal === 'lose') {
    calorieGoalMinKcal = Math.round(centerCalorieKcal * 0.9);
    calorieGoalMaxKcal = centerCalorieKcal;
  } else if (goal === 'gain') {
    calorieGoalMinKcal = centerCalorieKcal;
    calorieGoalMaxKcal = Math.round(centerCalorieKcal * 1.1);
  } else {
    calorieGoalMinKcal = Math.round(centerCalorieKcal * 0.9);
    calorieGoalMaxKcal = Math.round(centerCalorieKcal * 1.1);
  }

  return {
    proteinGoalMinG,
    proteinGoalMaxG,
    calorieGoalMinKcal: Math.max(GOAL_CLAMP_MIN, calorieGoalMinKcal),
    calorieGoalMaxKcal: Math.min(GOAL_CLAMP_MAX, calorieGoalMaxKcal),
  };
}

function bmr(gender: string, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78;
}

function safeActivity(activityLevel: string | null | undefined): ActivityLevel {
  if (activityLevel && activityLevel in ACTIVITY_FACTOR) return activityLevel as ActivityLevel;
  return DEFAULT_ACTIVITY;
}

export function safeGoal(goal: string | null | undefined): Goal {
  if (goal && goal in GOAL_CALORIE_FACTOR) return goal as Goal;
  return DEFAULT_GOAL;
}

type StoredGoalRange = {
  proteinGoalMinG?: number | null;
  proteinGoalMaxG?: number | null;
  calorieGoalMinKcal?: number | null;
  calorieGoalMaxKcal?: number | null;
};

export function resolveProfileGoalRanges(
  proteinGoalG: number | null | undefined,
  calorieGoalKcal: number | null | undefined,
  goal: string | null | undefined,
  stored: StoredGoalRange | null | undefined,
): GoalRange | null {
  if (proteinGoalG == null || calorieGoalKcal == null) return null;
  if (
    stored?.proteinGoalMinG != null &&
    stored?.proteinGoalMaxG != null &&
    stored?.calorieGoalMinKcal != null &&
    stored?.calorieGoalMaxKcal != null
  ) {
    return {
      proteinGoalMinG: stored.proteinGoalMinG,
      proteinGoalMaxG: stored.proteinGoalMaxG,
      calorieGoalMinKcal: stored.calorieGoalMinKcal,
      calorieGoalMaxKcal: stored.calorieGoalMaxKcal,
    };
  }
  return computeGoalRanges(proteinGoalG, calorieGoalKcal, safeGoal(goal));
}

function ageBandOf(age: number): AgeBand {
  if (age < TEEN_AGE_MAX + 1) return 'teen';
  if (age >= OLDER_AGE_MIN) return 'older';
  return 'adult';
}

function calorieFloorOf(gender: string): number {
  return CALORIE_FLOOR_BY_GENDER[gender] ?? CALORIE_FLOOR_BY_GENDER.unspecified;
}

function clampOlderDelta(delta: number): number {
  if (delta === 0) return 0;
  const abs = Math.min(OLDER_DELTA_MAX_ABS, Math.max(OLDER_DELTA_MIN_ABS, Math.abs(delta)));
  return delta < 0 ? -abs : abs;
}

/**
 * v1.4 — 메타까지 포함한 전체 결과.
 * `proteinGoalG` / `calorieGoalKcal`는 v1.3과 동일한 계약을 유지한다.
 */
export function calculateRecommendationFull(profile: ProfileForRecommendation): RecommendationFull {
  const activity = safeActivity(profile.activityLevel);
  const goal = safeGoal(profile.goal);
  const band = ageBandOf(profile.age);

  const baseBmr = bmr(profile.gender, profile.weightKg, profile.heightCm, profile.age);
  const tdee = baseBmr * ACTIVITY_FACTOR[activity];
  const tdeeRounded = Math.round(tdee);

  let calorieMode: CalorieMode;
  let calorieDeltaKcal: number;
  let calorieRaw: number;
  if (band === 'teen') {
    calorieMode = 'maintain_with_caution';
    calorieDeltaKcal = 0;
    calorieRaw = tdeeRounded;
  } else if (band === 'older') {
    const baseDelta = ADULT_CALORIE_DELTA[goal];
    calorieDeltaKcal = clampOlderDelta(baseDelta);
    calorieMode = baseDelta < 0 ? 'deficit' : baseDelta > 0 ? 'surplus' : 'maintain';
    calorieRaw = tdeeRounded + calorieDeltaKcal;
  } else {
    calorieDeltaKcal = ADULT_CALORIE_DELTA[goal];
    calorieMode = calorieDeltaKcal < 0 ? 'deficit' : calorieDeltaKcal > 0 ? 'surplus' : 'maintain';
    calorieRaw = tdeeRounded + calorieDeltaKcal;
  }

  const floor = calorieFloorOf(profile.gender);
  const floorApplied = calorieRaw < floor;
  const calorieGoalKcal = Math.max(calorieRaw, floor);

  let proteinPerKg: number;
  if (band === 'teen') {
    proteinPerKg = ADULT_PROTEIN_PER_KG.maintain;
  } else if (band === 'older') {
    proteinPerKg = Math.max(ADULT_PROTEIN_PER_KG[goal], OLDER_PROTEIN_MIN_PER_KG);
  } else {
    proteinPerKg = ADULT_PROTEIN_PER_KG[goal];
  }
  proteinPerKg = Math.min(proteinPerKg, PROTEIN_AUTO_CAP_PER_KG);
  const proteinGoalG = Math.round(profile.weightKg * proteinPerKg);

  const warnings: WarningCode[] = [];
  if (band === 'teen') warnings.push('teen_caution');
  if (band === 'older') warnings.push('older_adult_caution');
  if (floorApplied) warnings.push('low_calorie_floor_applied');

  return {
    proteinGoalG,
    calorieGoalKcal,
    recommendationVersion: '1.4',
    policy: {
      ageBand: band,
      proteinPerKg,
      calorieMode,
      calorieDeltaKcal,
    },
    warnings,
  };
}

/**
 * v1.3 호환 시그니처. 내부적으로 v1.4 정책표(`calculateRecommendationFull`)를 사용한다.
 * 메타가 필요한 호출자는 `calculateRecommendationFull`을 직접 사용한다.
 */
export function calculateRecommendation(profile: ProfileForRecommendation): RecommendationResult {
  const full = calculateRecommendationFull(profile);
  return { proteinGoalG: full.proteinGoalG, calorieGoalKcal: full.calorieGoalKcal };
}
