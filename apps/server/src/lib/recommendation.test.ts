import { describe, expect, it } from 'vitest';
import { computeGoalRanges } from './recommendation.js';

describe('computeGoalRanges', () => {
  it('protein uses ±5% with minimum 5g margin', () => {
    const r = computeGoalRanges(100, 2000, 'maintain');
    expect(r.proteinGoalMinG).toBe(95);
    expect(r.proteinGoalMaxG).toBe(105);
  });

  it('maintain calorie uses ±10%', () => {
    const r = computeGoalRanges(80, 2000, 'maintain');
    expect(r.calorieGoalMinKcal).toBe(1800);
    expect(r.calorieGoalMaxKcal).toBe(2200);
  });

  it('lose calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 'lose');
    expect(r.calorieGoalMinKcal).toBe(1800);
    expect(r.calorieGoalMaxKcal).toBe(2000);
  });

  it('gain calorie is asymmetric', () => {
    const r = computeGoalRanges(80, 2000, 'gain');
    expect(r.calorieGoalMinKcal).toBe(2000);
    expect(r.calorieGoalMaxKcal).toBe(2200);
  });
});
