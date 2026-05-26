import type { Goal, ProfileGetResponse } from '../api/profile';

export type FulfillmentMetric = 'protein' | 'calorie' | 'carbohydrate' | 'fat';
export type FulfillmentStatus = 'under' | 'met' | 'over' | 'none';

export type GoalBounds = {
  min: number | null;
  max: number | null;
};

export type FulfillmentResult = {
  pct: number;
  status: FulfillmentStatus;
  detailLabel: string;
  barPct: number;
  tone: 'primary' | 'warn' | 'muted';
};

type Direction = 'atLeast' | 'atMost' | 'band';

function calorieDirection(goal: Goal | null | undefined): Direction {
  if (goal === 'lose') return 'atMost';
  if (goal === 'gain') return 'atLeast';
  return 'band';
}

function proteinDirection(): Direction {
  return 'atLeast';
}

function metricDirection(metric: FulfillmentMetric, goal: Goal | null | undefined): Direction {
  if (metric === 'protein') return proteinDirection();
  if (metric === 'calorie') return calorieDirection(goal);
  return 'band';
}

function rangeLabel(bounds: GoalBounds | undefined, goal: number | null, unit: string): string {
  if (bounds?.min != null && bounds?.max != null) {
    return `${bounds.min}–${bounds.max}${unit}`;
  }
  if (goal != null) return `${goal}${unit}`;
  return '';
}

export function computeFulfillment(
  metric: FulfillmentMetric,
  current: number,
  goal: number | null,
  profile: Pick<ProfileGetResponse, 'goal'> | null | undefined,
  bounds?: GoalBounds,
): FulfillmentResult {
  const effectiveGoal = goal ?? bounds?.max ?? bounds?.min ?? null;
  if (effectiveGoal == null || effectiveGoal <= 0) {
    return { pct: 0, status: 'none', detailLabel: `${Math.round(current)}`, barPct: 0, tone: 'muted' };
  }

  const unit = metric === 'calorie' ? ' kcal' : 'g';
  const goalText = rangeLabel(bounds, goal, unit);
  const direction = metricDirection(metric, profile?.goal);
  const barMax = bounds?.max ?? effectiveGoal;
  const rawPct = barMax > 0 ? Math.round((current / barMax) * 100) : 0;

  if (direction === 'atLeast') {
    const threshold = bounds?.min ?? effectiveGoal;
    if (current < threshold) {
      return {
        pct: rawPct,
        status: 'under',
        detailLabel: `${Math.round(current)}/${goalText} · ${rawPct}% (목표 미달)`,
        barPct: Math.min(100, rawPct),
        tone: 'warn',
      };
    }
    return {
      pct: rawPct,
      status: current > (bounds?.max ?? effectiveGoal) ? 'over' : 'met',
      detailLabel:
        current > (bounds?.max ?? effectiveGoal)
          ? `${Math.round(current)}/${goalText} · 목표 달성 (+${Math.round(current - (bounds?.max ?? effectiveGoal))})`
          : `${Math.round(current)}/${goalText} · 목표 달성`,
      barPct: 100,
      tone: 'primary',
    };
  }

  if (direction === 'atMost') {
    const threshold = bounds?.max ?? effectiveGoal;
    if (current > threshold) {
      return {
        pct: rawPct,
        status: 'over',
        detailLabel: `${Math.round(current)}/${goalText} · ${rawPct}% (목표 초과)`,
        barPct: 100,
        tone: 'warn',
      };
    }
    const met = current >= (bounds?.min ?? threshold);
    return {
      pct: rawPct,
      status: met ? 'met' : 'under',
      detailLabel: met
        ? `${Math.round(current)}/${goalText} · 목표 달성`
        : `${Math.round(current)}/${goalText} · ${rawPct}% (목표 미달)`,
      barPct: met ? 100 : Math.min(100, rawPct),
      tone: met ? 'primary' : 'warn',
    };
  }

  const low = bounds?.min ?? effectiveGoal * 0.9;
  const high = bounds?.max ?? effectiveGoal * 1.1;
  if (current < low) {
    return {
      pct: rawPct,
      status: 'under',
      detailLabel: `${Math.round(current)}/${goalText} · ${rawPct}% (권장 하한 미달)`,
      barPct: Math.min(100, rawPct),
      tone: 'warn',
    };
  }
  if (current > high) {
    return {
      pct: rawPct,
      status: 'over',
      detailLabel: `${Math.round(current)}/${goalText} · ${rawPct}% (권장 상한 초과)`,
      barPct: 100,
      tone: 'warn',
    };
  }
  return {
    pct: rawPct,
    status: 'met',
    detailLabel: `${Math.round(current)}/${goalText} · 목표 달성`,
    barPct: 100,
    tone: 'primary',
  };
}
