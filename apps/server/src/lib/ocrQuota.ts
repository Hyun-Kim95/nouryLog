import type { User } from '@prisma/client';
import { prisma } from './prisma.js';

export const OCR_FREE_LIMIT_NORMAL = Number(process.env.OCR_FREE_LIMIT_NORMAL ?? 10);
export const OCR_FREE_LIMIT_REDUCED = Number(process.env.OCR_FREE_LIMIT_REDUCED ?? 5);
export const OCR_FREE_USER_THRESHOLD = Number(process.env.OCR_FREE_USER_THRESHOLD ?? 100);

const USER_COUNT_CACHE_MS = 60_000;
let cachedActiveUserCount: { at: number; count: number } | null = null;

/** Asia/Seoul 기준 YYYY-MM */
export function currentOcrPeriodKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).format(now);
}

export function resolveOcrFreeLimitForUserCount(activeUserCount: number): number {
  const threshold = OCR_FREE_USER_THRESHOLD;
  const normal = OCR_FREE_LIMIT_NORMAL;
  const reduced = OCR_FREE_LIMIT_REDUCED;
  if (!Number.isFinite(threshold) || threshold < 0) return normal;
  if (!Number.isFinite(normal) || normal < 1) return 10;
  if (!Number.isFinite(reduced) || reduced < 1) return 5;
  return activeUserCount > threshold ? reduced : normal;
}

export async function getActiveUserCountCached(): Promise<number> {
  const now = Date.now();
  if (cachedActiveUserCount && now - cachedActiveUserCount.at < USER_COUNT_CACHE_MS) {
    return cachedActiveUserCount.count;
  }
  const count = await prisma.user.count({ where: { role: 'USER', active: true } });
  cachedActiveUserCount = { at: now, count };
  return count;
}

export async function getOcrFreeLimitForMonth(): Promise<number> {
  const count = await getActiveUserCountCached();
  return resolveOcrFreeLimitForUserCount(count);
}

export type OcrPeriodUserSlice = Pick<User, 'id' | 'freeOcrUsed' | 'freeOcrMonth'>;

/** null/다른 월이면 해당 월로 맞추고 used=0. 같은 월이면 그대로. */
export function ocrPeriodPatchIfNeeded(
  user: OcrPeriodUserSlice,
  periodKey = currentOcrPeriodKey(),
): { freeOcrMonth: string; freeOcrUsed: number } | null {
  if (user.freeOcrMonth === periodKey) {
    return null;
  }
  return { freeOcrMonth: periodKey, freeOcrUsed: 0 };
}

export async function ensureOcrPeriod(user: OcrPeriodUserSlice): Promise<{
  freeOcrMonth: string;
  freeOcrUsed: number;
}> {
  const periodKey = currentOcrPeriodKey();
  const patch = ocrPeriodPatchIfNeeded(user, periodKey);
  if (!patch) {
    return { freeOcrMonth: user.freeOcrMonth!, freeOcrUsed: user.freeOcrUsed };
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: patch,
    select: { freeOcrMonth: true, freeOcrUsed: true },
  });
  return {
    freeOcrMonth: updated.freeOcrMonth!,
    freeOcrUsed: updated.freeOcrUsed,
  };
}

export function nextPaywallTriggerForQuota(
  ocrPaid: boolean,
  used: number,
  limit: number,
): 'none' | 'ocr_remaining_1' | 'ocr_exhausted' {
  if (ocrPaid) return 'none';
  if (used >= limit) return 'ocr_exhausted';
  if (limit > 0 && used >= limit - 1) return 'ocr_remaining_1';
  return 'none';
}

/** 테스트용 캐시 초기화 */
export function resetOcrUserCountCacheForTests(): void {
  cachedActiveUserCount = null;
}
