import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachInsight } from './aiCoachInsight.js';
import { computeMacroBreakdown } from './aiCoachWeekMetrics.js';
import { pickEvidenceMeals, mealRowToCitation } from './aiCoachSummaryService.js';
import type { AiAggregateResult } from './aiMealAggregate.js';

function mockWeekAgg(overrides: Partial<AiAggregateResult['computed']> = {}): AiAggregateResult {
  return {
    computed: {
      period: {
        anchor: '2026-06-03',
        from: '2026-05-25T00:00:00+09:00',
        toExclusive: '2026-06-01T00:00:00+09:00',
        label: '5/25 – 5/31',
        timezone: 'Asia/Seoul',
        kind: 'week_single',
      },
      summary: { protein: 60, calories: 1300, carbohydrate: 140, fat: 30 },
      goalComparison: {
        proteinGoalG: 80,
        proteinAvgGapG: -20,
        proteinMet: false,
        calorieGoalKcal: 2000,
        calorieMet: true,
      },
      mealCount: 10,
      aggregation: 'dailyAverage',
      periodMeta: { recordedDays: 5, calendarDays: 7 },
      ...overrides,
    },
    citations: [],
  };
}

describe('computeMacroBreakdown', () => {
  it('returns macro percentages summing to ~100', () => {
    const m = computeMacroBreakdown({ protein: 50, calories: 500, carbohydrate: 50, fat: 20 });
    assert.ok(m.proteinPct >= 0 && m.carbPct >= 0 && m.fatPct >= 0);
    assert.ok(m.proteinPct + m.carbPct + m.fatPct <= 100);
  });
});

describe('buildCoachInsight', () => {
  it('returns empty-week CTA when no meals', () => {
    const insight = buildCoachInsight(mockWeekAgg({ mealCount: 0 }), {
      proteinMetDays: 0,
      calorieMetDays: 0,
      countedDays: 0,
      proteinShortDays: 0,
      calorieShortDays: 0,
    });
    assert.match(insight.text, /기록이 없습니다/);
    assert.equal(insight.source, 'template');
  });

  it('mentions protein gap when avg below goal', () => {
    const insight = buildCoachInsight(mockWeekAgg(), {
      proteinMetDays: 1,
      calorieMetDays: 4,
      countedDays: 5,
      proteinShortDays: 4,
      calorieShortDays: 1,
    });
    assert.match(insight.text, /단백질/);
  });
});

describe('pickEvidenceMeals', () => {
  it('prefers low-protein breakfasts', () => {
    const meals = [
      {
        id: '1',
        name: '커피',
        consumedAt: new Date('2026-06-01T03:00:00+09:00'),
        protein: 2,
        calories: 50,
        carbohydrate: 5,
        fat: 1,
        mealSlot: 'BREAKFAST',
      },
      {
        id: '2',
        name: '닭가슴살',
        consumedAt: new Date('2026-06-01T12:00:00+09:00'),
        protein: 40,
        calories: 200,
        carbohydrate: 0,
        fat: 5,
        mealSlot: 'LUNCH',
      },
    ];
    const evidence = pickEvidenceMeals(meals, 80);
    assert.equal(evidence[0]!.foodName, '커피');
    assert.equal(evidence[0]!.type, 'meal');
  });
});

describe('mealRowToCitation', () => {
  it('builds label with meal slot', () => {
    const c = mealRowToCitation({
      id: 'x',
      name: '계란',
      consumedAt: new Date('2026-06-03T01:00:00+09:00'),
      protein: 12,
      calories: 150,
      carbohydrate: 1,
      fat: 10,
      mealSlot: 'BREAKFAST',
    });
    assert.equal(c.type, 'meal');
    assert.match(c.label, /계란/);
  });
});
