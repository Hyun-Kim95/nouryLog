import { prisma } from '../../lib/prisma.js';
import { parseYmdParts, sundayOfWeekYmd } from '../../lib/statsPeriod.js';
import { getMealsRevision } from './aiMealsRevision.js';

export type ReportKind = 'week' | 'month';

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 캐시 키용 anchor 정규화 */
export function normalizeCacheAnchor(kind: ReportKind, anchorYmd: string): string {
  if (kind === 'week') return sundayOfWeekYmd(anchorYmd);
  const { y, m } = parseYmdParts(anchorYmd);
  return formatYmd(y, m, 1);
}

export async function getCachedPeriodReport<T>(
  userId: string,
  kind: ReportKind,
  anchor: string,
  from: Date,
  toExclusive: Date,
): Promise<T | null> {
  const cacheAnchor = normalizeCacheAnchor(kind, anchor);
  const currentRevision = await getMealsRevision(userId, from, toExclusive);

  const row = await prisma.aiPeriodReport.findUnique({
    where: { userId_kind_anchor: { userId, kind, anchor: cacheAnchor } },
  });
  if (!row) return null;
  if (!row.mealsRevision || row.mealsRevision !== currentRevision) return null;
  return row.payload as T;
}

export async function setCachedPeriodReport(
  userId: string,
  kind: ReportKind,
  anchor: string,
  from: Date,
  toExclusive: Date,
  payload: unknown,
): Promise<void> {
  const cacheAnchor = normalizeCacheAnchor(kind, anchor);
  const mealsRevision = await getMealsRevision(userId, from, toExclusive);

  await prisma.aiPeriodReport.upsert({
    where: { userId_kind_anchor: { userId, kind, anchor: cacheAnchor } },
    create: { userId, kind, anchor: cacheAnchor, mealsRevision, payload: payload as object },
    update: { payload: payload as object, mealsRevision, createdAt: new Date() },
  });
}
