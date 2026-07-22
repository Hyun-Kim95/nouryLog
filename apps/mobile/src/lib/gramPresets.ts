/** Phase 1.1: name-matched gram presets (Railway frequency). */

export type GramPreset = {
  id: string;
  label: string;
  grams: number;
  /** Return true when food name should show this preset. */
  matches: (name: string) => boolean;
};

function includesNormalized(name: string, needle: string): boolean {
  return name.replace(/\s+/g, '').includes(needle);
}

export const GRAM_PRESETS: GramPreset[] = [
  {
    id: 'egg',
    label: '1개',
    grams: 50,
    matches: (name) => includesNormalized(name, '계란'),
  },
  {
    id: 'soju',
    label: '1병',
    grams: 360,
    matches: (name) => includesNormalized(name, '소주'),
  },
  {
    id: 'beer',
    label: '1병',
    grams: 500,
    matches: (name) => includesNormalized(name, '맥주'),
  },
  {
    id: 'gim',
    label: '1장',
    grams: 2,
    // Exact only — avoid matching 「김·밥」
    matches: (name) => name.trim() === '김',
  },
  {
    id: 'banana',
    label: '1개',
    grams: 120,
    matches: (name) => includesNormalized(name, '바나나'),
  },
  {
    id: 'ramen',
    label: '1개',
    grams: 120,
    matches: (name) => {
      const n = name.replace(/\s+/g, '');
      return (
        n.includes('라면') ||
        n.includes('짜파게티') ||
        n.includes('컵라면') ||
        n.includes('불닭')
      );
    },
  },
];

export function matchingGramPresets(foodName: string): GramPreset[] {
  const name = foodName.trim();
  if (!name) return [];
  return GRAM_PRESETS.filter((p) => p.matches(name));
}
