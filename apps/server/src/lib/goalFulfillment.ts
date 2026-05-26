export type FulfillmentMetric = 'protein' | 'calorie' | 'carbohydrate' | 'fat';
export type FulfillmentStatus = 'under' | 'met' | 'over' | 'none';

export type GoalBounds = {
  min: number | null;
  max: number | null;
};

export type FulfillmentResult = {
  pct: number;
  status: FulfillmentStatus;
};

type ProfileGoal = {
  goal?: string | null;
};

function calorieDirection(goal: string | null | undefined): 'atLeast' | 'atMost' | 'band' {
  if (goal === 'lose') return 'atMost';
  if (goal === 'gain') return 'atLeast';
  return 'band';
}

function proteinDirection(): 'atLeast' {
  return 'atLeast';
}

function macroDirection(metric: FulfillmentMetric, goal: string | null | undefined): 'atLeast' | 'atMost' | 'band' {
  if (metric === 'protein') return proteinDirection();
  if (metric === 'calorie') return calorieDirection(goal);
  // 탄수/지방은 목표 유형 무관하게 권장 범위(band)로 판단한다.
  return 'band';
}

export function computeFulfillment(
  metric: FulfillmentMetric,
  current: number,
  goal: number | null,
  profile: ProfileGoal | null | undefined,
  bounds?: GoalBounds,
): FulfillmentResult {
  const effectiveGoal = goal ?? bounds?.max ?? bounds?.min ?? null;
  if (effectiveGoal == null || effectiveGoal <= 0) {
    return { pct: 0, status: 'none' };
  }

  const direction = macroDirection(metric, profile?.goal);
  const barMax = bounds?.max ?? effectiveGoal;
  const rawPct = barMax > 0 ? Math.round((current / barMax) * 100) : 0;

  if (direction === 'atLeast') {
    const threshold = bounds?.min ?? effectiveGoal;
    if (current < threshold) {
      return { pct: rawPct, status: 'under' };
    }
    return {
      pct: rawPct,
      status: current > (bounds?.max ?? effectiveGoal) ? 'over' : 'met',
    };
  }

  if (direction === 'atMost') {
    const threshold = bounds?.max ?? effectiveGoal;
    if (current > threshold) {
      return { pct: rawPct, status: 'over' };
    }
    return {
      pct: rawPct,
      status: current >= (bounds?.min ?? threshold) ? 'met' : 'under',
    };
  }

  const low = bounds?.min ?? effectiveGoal * 0.9;
  const high = bounds?.max ?? effectiveGoal * 1.1;
  if (current < low) return { pct: rawPct, status: 'under' };
  if (current > high) return { pct: rawPct, status: 'over' };
  return { pct: rawPct, status: 'met' };
}

export function isGoalMet(
  metric: FulfillmentMetric,
  current: number,
  goal: number | null,
  profile: ProfileGoal | null | undefined,
  bounds?: GoalBounds,
): boolean {
  return computeFulfillment(metric, current, goal, profile, bounds).status === 'met';
}
