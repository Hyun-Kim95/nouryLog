import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allMacrosMissing,
  extractServingGrams,
  parseNutritionFromText,
} from './nutritionParser.js';

describe('extractServingGrams', () => {
  it('parses Korean 1회 제공량', () => {
    assert.equal(extractServingGrams('1회 제공량 30g\n열량 120kcal'), 30);
  });

  it('parses OCR line-broken 1회/제공량 and 그램', () => {
    assert.equal(extractServingGrams('1회\n제공량\n55g\n열량 200kcal'), 55);
    assert.equal(extractServingGrams('1회 제공량 40그램'), 40);
  });

  it('parses compact 1회제공량 and English serving size', () => {
    assert.equal(extractServingGrams('1회제공량 55 g'), 55);
    assert.equal(extractServingGrams('Serving Size 40g\nCalories 200'), 40);
  });

  it('parses 내용량 g', () => {
    assert.equal(extractServingGrams('내용량 100g'), 100);
  });

  it('returns null when missing, ml-only, or out of range', () => {
    assert.equal(extractServingGrams('열량 100kcal 단백질 10g'), null);
    assert.equal(extractServingGrams('1회 제공량 250ml'), null);
    assert.equal(extractServingGrams('1회 제공량 0g'), null);
    assert.equal(extractServingGrams('1회 제공량 6000g'), null);
  });
});

describe('parseNutritionFromText', () => {
  it('includes servingGrams when present and keeps macro confidence', () => {
    const parsed = parseNutritionFromText(
      '1회 제공량 30g\n열량 120kcal\n탄수화물 10g\n단백질 8g\n지방 4g',
    );
    assert.equal(parsed.servingGrams, 30);
    assert.equal(parsed.calories, 120);
    assert.equal(parsed.confidence, 1);
    assert.ok(!parsed.missingFields.includes('servingGrams'));
  });

  it('marks servingGrams missing without failing macros', () => {
    const parsed = parseNutritionFromText('열량 120kcal\n탄수화물 10g\n단백질 8g\n지방 4g');
    assert.equal(parsed.servingGrams, null);
    assert.ok(parsed.missingFields.includes('servingGrams'));
    assert.equal(parsed.confidence, 1);
    assert.equal(allMacrosMissing(parsed.missingFields), false);
  });

  it('allMacrosMissing ignores servingGrams-only absence', () => {
    assert.equal(allMacrosMissing(['servingGrams']), false);
    assert.equal(allMacrosMissing(['calories', 'carbohydrate', 'protein', 'fat']), true);
    assert.equal(
      allMacrosMissing(['calories', 'carbohydrate', 'protein', 'fat', 'servingGrams']),
      true,
    );
  });
});
