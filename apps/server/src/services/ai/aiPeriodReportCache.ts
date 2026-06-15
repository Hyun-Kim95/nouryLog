import { prisma } from '../../lib/prisma.js';
import { parseYmdParts } from '../../lib/statsPeriod.js';
import { getMealsRevision } from './aiMealsRevision.js';

export type ReportKind = 'week' | 'month';

/** Bump when report payload shape or analysis rules change (invalidates DB cache). */
export const AI_PERIOD_REPORT_PAYLOAD_VERSION = 2;

export const AI_PERIOD_REPORT_VERSION_KEY = '_payloadVersion';

type VersionedPayload = { [typeof AI_PERIOD_REPORT_VERSION_KEY]?: number };

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 캐시 키용 anchor 정규화 */
export function normalizeCacheAnchor(kind: ReportKind, anchorYmd: string): string {
  if (kind === 'week') return anchorYmd;
  const { y, m } = parseYmdParts(anchorYmd);
  return formatYmd(y, m, 1);
}

export function isCurrentPeriodReportPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return (payload as VersionedPayload)[AI_PERIOD_REPORT_VERSION_KEY] === AI_PERIOD_REPORT_PAYLOAD_VERSION;
}

export function attachPeriodReportPayloadVersion(payload: unknown): object {
  return {
    ...(payload as object),
    [AI_PERIOD_REPORT_VERSION_KEY]: AI_PERIOD_REPORT_PAYLOAD_VERSION,
  };
}

export function stripPeriodReportPayloadVersion<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  const { [AI_PERIOD_REPORT_VERSION_KEY]: _v, ...rest } = payload as VersionedPayload & Record<string, unknown>;
  return rest as T;
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
  if (!isCurrentPeriodReportPayload(row.payload)) return null;
  return stripPeriodReportPayloadVersion<T>(row.payload);
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
  const stored = attachPeriodReportPayloadVersion(payload);

  await prisma.aiPeriodReport.upsert({
    where: { userId_kind_anchor: { userId, kind, anchor: cacheAnchor } },
    create: { userId, kind, anchor: cacheAnchor, mealsRevision, payload: stored },
    update: { payload: stored, mealsRevision, createdAt: new Date() },
  });
}
