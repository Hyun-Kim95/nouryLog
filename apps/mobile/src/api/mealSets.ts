import { apiFetch } from '../api';
import type { MealSlot, SnackPlacement } from '../lib/mealSlot';

export type MealSetItemInputMode = 'PORTION_COUNT' | 'TOTAL_GRAMS';

export type MealSetItem = {
  id: string;
  kind: string;
  foodTemplateId: string | null;
  mealInputMode: MealSetItemInputMode | null;
  portionQuantity: number | null;
  totalGrams: number | null;
  // kind=manual 스냅샷 (template 항목은 null)
  name: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrate: number | null;
  fat: number | null;
  grams: number | null;
  displayOrder: number;
};

export type MealSet = {
  id: string;
  name: string;
  defaultMealSlot: MealSlot;
  defaultSnackPlacement: SnackPlacement | null;
  createdAt: string;
  items: MealSetItem[];
};

export type MealSetTemplateItemInput = {
  kind: 'template';
  foodTemplateId: string;
  mealInputMode: MealSetItemInputMode;
  portionQuantity?: number;
  totalGrams?: number;
};

export type MealSetManualItemInput = {
  kind: 'manual';
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  grams?: number;
};

export type MealSetItemInput = MealSetTemplateItemInput | MealSetManualItemInput;

export type MealSetUpsertBody = {
  name: string;
  defaultMealSlot: MealSlot;
  defaultSnackPlacement?: SnackPlacement | null;
  items: MealSetItemInput[];
};

export type MealSetApplyBody = {
  clientRequestId: string;
  consumedAt?: string;
  mealSlot?: MealSlot;
  snackPlacement?: SnackPlacement;
  excludeItemIds?: string[];
};

export type MealSetApplyResult = {
  createdMealIds: string[];
  skippedItemIds: string[];
};

export type MealSetUnavailableReason =
  | 'TEMPLATE_MISSING'
  | 'TEMPLATE_INACTIVE'
  | 'NUTRITION_INCOMPLETE';

export type MealSetUnavailableItem = {
  itemId: string;
  reason: MealSetUnavailableReason;
};

export async function listMealSets(token: string): Promise<{ items: MealSet[] }> {
  return apiFetch<{ items: MealSet[] }>('/me/meal-sets', { token });
}

export async function getMealSet(token: string, id: string): Promise<MealSet> {
  return apiFetch<MealSet>(`/me/meal-sets/${id}`, { token });
}

export async function createMealSet(token: string, body: MealSetUpsertBody): Promise<MealSet> {
  return apiFetch<MealSet>('/me/meal-sets', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export async function updateMealSet(
  token: string,
  id: string,
  body: MealSetUpsertBody,
): Promise<MealSet> {
  return apiFetch<MealSet>(`/me/meal-sets/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(body),
  });
}

export async function deactivateMealSet(token: string, id: string): Promise<void> {
  await apiFetch(`/me/meal-sets/${id}/deactivate`, { method: 'PATCH', token });
}

export async function applyMealSet(
  token: string,
  id: string,
  body: MealSetApplyBody,
  opts?: { timeoutMs?: number },
): Promise<MealSetApplyResult> {
  return apiFetch<MealSetApplyResult>(`/me/meal-sets/${id}/apply`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
    timeoutMs: opts?.timeoutMs,
  });
}

/** 409 MEAL_SET_ITEM_UNAVAILABLE 응답의 details.items 파싱. */
export function parseUnavailableItems(details: unknown): MealSetUnavailableItem[] {
  if (!details || typeof details !== 'object') return [];
  const raw = (details as { items?: unknown }).items;
  if (!Array.isArray(raw)) return [];
  const out: MealSetUnavailableItem[] = [];
  for (const it of raw) {
    if (it && typeof it === 'object' && typeof (it as { itemId?: unknown }).itemId === 'string') {
      out.push({
        itemId: (it as { itemId: string }).itemId,
        reason: ((it as { reason?: MealSetUnavailableReason }).reason ?? 'TEMPLATE_INACTIVE'),
      });
    }
  }
  return out;
}
