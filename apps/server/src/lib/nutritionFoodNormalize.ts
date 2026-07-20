/** NFC + collapse whitespace + trim; Latin casefold for search key. */
export function normalizeNutritionFoodName(name: string): string {
  const nfc = name.normalize('NFC');
  const collapsed = nfc.replace(/\s+/g, ' ').trim();
  return collapsed.replace(/[A-Za-z]+/g, (m) => m.toLocaleLowerCase('en-US'));
}
