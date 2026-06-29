import type { MealSlot, SnackPlacement } from '@prisma/client';
import { todayAnchorKst } from './statsPeriod.js';

export const MEAL_SET_NAME_MAX = 40;
export const MEAL_SET_ITEMS_MAX = 20;
export const MEAL_SET_ACTIVE_MAX = 50;

/** 세트 이름 검증: 공백 제거 후 1~40자. */
export function validateMealSetName(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { ok: false, message: '세트 이름을 입력해 주세요.' };
  if (value.length > MEAL_SET_NAME_MAX) {
    return { ok: false, message: `세트 이름은 최대 ${MEAL_SET_NAME_MAX}자까지 가능합니다.` };
  }
  return { ok: true, value };
}

/**
 * apply 시 consumedAt이 미래 일자인지(KST 기준) 판정. (AC-17 / D5)
 * 과거·오늘은 허용, 내일 이후는 차단.
 */
export function isConsumedAtInFutureKst(consumedAt: Date, now = new Date()): boolean {
  if (Number.isNaN(consumedAt.getTime())) return false;
  return todayAnchorKst(consumedAt) > todayAnchorKst(now);
}

/**
 * apply 시 실제 적용할 snackPlacement 해석. (AC-13)
 * - 실효 끼니가 SNACK이 아니면 항상 null
 * - SNACK이면 override ?? 세트 기본값, 둘 다 없으면 invalid
 */
export function resolveApplySnackPlacement(
  effectiveSlot: MealSlot,
  setDefault: SnackPlacement | null,
  override: SnackPlacement | null | undefined,
): { ok: true; value: SnackPlacement | null } | { ok: false; message: string } {
  if (effectiveSlot !== 'SNACK') {
    return { ok: true, value: null };
  }
  const placement = override ?? setDefault ?? null;
  if (!placement) {
    return { ok: false, message: '간식은 언제 드셨는지 선택해 주세요.' };
  }
  return { ok: true, value: placement };
}

/**
 * 배치 멱등키에서 항목별 멱등키 파생. (AC-07 / AC-14)
 * 동일 batch 재전송 시 항목별로도 동일 키가 나와 중복 생성을 막는다.
 */
export function deriveItemClientRequestId(
  batchClientRequestId: string,
  itemId: string,
): string {
  return `${batchClientRequestId}:${itemId}`;
}

export type ApplyItemLike = { id: string };

/**
 * excludeItemIds로 제외 후 실제 등록 대상/제외 목록 분리. (AC-05/D3)
 */
export function selectApplicableItems<T extends ApplyItemLike>(
  items: T[],
  excludeItemIds: string[] = [],
): { applicable: T[]; skippedItemIds: string[] } {
  const exclude = new Set(excludeItemIds);
  const applicable: T[] = [];
  const skippedItemIds: string[] = [];
  for (const it of items) {
    if (exclude.has(it.id)) skippedItemIds.push(it.id);
    else applicable.push(it);
  }
  return { applicable, skippedItemIds };
}

export type TemplateAvailability = {
  itemId: string;
  foodTemplateId: string | null;
  templateActive: boolean;
  nutritionComplete: boolean;
};

/**
 * 등록 전 사용 불가 항목 사전 검증. (AC-05 / AC-15)
 * - 템플릿 참조 소실(foodTemplateId=null)
 * - 비활성 템플릿
 * - 영양/환산 불가(nutritionComplete=false)
 */
export function findUnavailableTemplateItems(
  items: TemplateAvailability[],
): { itemId: string; reason: 'TEMPLATE_MISSING' | 'TEMPLATE_INACTIVE' | 'NUTRITION_INCOMPLETE' }[] {
  const out: { itemId: string; reason: 'TEMPLATE_MISSING' | 'TEMPLATE_INACTIVE' | 'NUTRITION_INCOMPLETE' }[] = [];
  for (const it of items) {
    if (!it.foodTemplateId) {
      out.push({ itemId: it.itemId, reason: 'TEMPLATE_MISSING' });
    } else if (!it.templateActive) {
      out.push({ itemId: it.itemId, reason: 'TEMPLATE_INACTIVE' });
    } else if (!it.nutritionComplete) {
      out.push({ itemId: it.itemId, reason: 'NUTRITION_INCOMPLETE' });
    }
  }
  return out;
}
