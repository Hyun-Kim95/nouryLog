import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptySlotDistribution,
  mealNameWhere,
  normalizeMealQuery,
  slotDistributionFromGroups,
  totalFromDistribution,
} from './mealSearch.js';

// AC-02: 검색어 trim·대소문자 무시
describe('normalizeMealQuery (AC-02)', () => {
  it('trims surrounding whitespace', () => {
    assert.equal(normalizeMealQuery('  라면 '), '라면');
  });

  it('returns empty string for nullish', () => {
    assert.equal(normalizeMealQuery(undefined), '');
    assert.equal(normalizeMealQuery(null), '');
    assert.equal(normalizeMealQuery('   '), '');
  });
});

// AC-01 / AC-02: 이름 부분 일치 where (insensitive)
describe('mealNameWhere (AC-01, AC-02)', () => {
  it('builds insensitive contains filter', () => {
    assert.deepEqual(mealNameWhere('라면'), {
      name: { contains: '라면', mode: 'insensitive' },
    });
  });

  it('returns empty fragment for empty query', () => {
    assert.deepEqual(mealNameWhere(''), {});
  });
});

// AC-09: 끼니 분포 집계
describe('slotDistributionFromGroups (AC-09)', () => {
  it('maps groups and folds null into UNSPECIFIED', () => {
    const dist = slotDistributionFromGroups([
      { mealSlot: 'BREAKFAST', count: 2 },
      { mealSlot: 'SNACK', count: 4 },
      { mealSlot: null, count: 1 },
    ]);
    assert.equal(dist.BREAKFAST, 2);
    assert.equal(dist.SNACK, 4);
    assert.equal(dist.UNSPECIFIED, 1);
    assert.equal(dist.LUNCH, 0);
    assert.equal(dist.DINNER, 0);
  });

  it('empty distribution has all five keys at zero', () => {
    const dist = emptySlotDistribution();
    assert.deepEqual(dist, { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0, UNSPECIFIED: 0 });
  });
});

// AC-03: 빈도 = 분포 합
describe('totalFromDistribution (AC-03)', () => {
  it('sums all slot counts', () => {
    const dist = slotDistributionFromGroups([
      { mealSlot: 'LUNCH', count: 3 },
      { mealSlot: 'DINNER', count: 3 },
      { mealSlot: 'SNACK', count: 4 },
      { mealSlot: 'BREAKFAST', count: 2 },
    ]);
    assert.equal(totalFromDistribution(dist), 12);
  });
});
