import type { Goal, ProfileGetResponse } from '../api/profile';

export type FulfillmentMetric = 'protein' | 'calorie';
export type FulfillmentStatus = 'under' | 'met' | 'over' | 'none';

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

export function computeFulfillment(
  metric: FulfillmentMetric,
  current: number,
  goal: number | null,
  profile: Pick<ProfileGetResponse, 'goal'> | null | undefined,
): FulfillmentResult {
  if (goal == null || goal <= 0) {
    return { pct: 0, status: 'none', detailLabel: `${Math.round(current)}`, barPct: 0, tone: 'muted' };
  }

  const direction = metric === 'protein' ? proteinDirection() : calorieDirection(profile?.goal);
  const rawPct = Math.round((current / goal) * 100);

  if (direction === 'atLeast') {
    if (current < goal) {
      return {
        pct: rawPct,
        status: 'under',
        detailLabel: `${Math.round(current)}/${goal} · ${rawPct}% (목표 미달)`,
        barPct: Math.min(100, rawPct),
        tone: 'warn',
      };
    }
    return {
      pct: rawPct,
      status: current > goal ? 'over' : 'met',
      detailLabel:
        current > goal
          ? `${Math.round(current)}/${goal} · 목표 달성 (+${Math.round(current - goal)})`
          : `${Math.round(current)}/${goal} · 목표 달성`,
      barPct: 100,
      tone: 'primary',
    };
  }

  if (direction === 'atMost') {
    if (current > goal) {
      return {
        pct: rawPct,
        status: 'over',
        detailLabel: `${Math.round(current)}/${goal} · ${rawPct}% (목표 초과)`,
        barPct: 100,
        tone: 'warn',
      };
    }
    return {
      pct: rawPct,
      status: current === goal ? 'met' : 'under',
      detailLabel: `${Math.round(current)}/${goal} · ${rawPct}%`,
      barPct: Math.min(100, rawPct),
      tone: 'primary',
    };
  }

  // maintain band ±10%
  const low = goal * 0.9;
  const high = goal * 1.1;
  if (current < low) {
    return {
      pct: rawPct,
      status: 'under',
      detailLabel: `${Math.round(current)}/${goal} · ${rawPct}% (권장 하한 미달)`,
      barPct: Math.min(100, rawPct),
      tone: 'warn',
    };
  }
  if (current > high) {
    return {
      pct: rawPct,
      status: 'over',
      detailLabel: `${Math.round(current)}/${goal} · ${rawPct}% (권장 상한 초과)`,
      barPct: 100,
      tone: 'warn',
    };
  }
  return {
    pct: rawPct,
    status: 'met',
    detailLabel: `${Math.round(current)}/${goal} · 권장 범위 내`,
    barPct: Math.min(100, rawPct),
    tone: 'primary',
  };
}
