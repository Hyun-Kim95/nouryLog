import type { Prisma } from '@prisma/client';

/** 현재 시각 기준 앱에 노출 가능한 공지(where) */
export function publishedNoticeWhere(now = new Date()): Prisma.NoticeWhereInput {
  return {
    active: true,
    AND: [
      { OR: [{ publishStart: null }, { publishStart: { lte: now } }] },
      { OR: [{ publishEnd: null }, { publishEnd: { gte: now } }] },
    ],
  };
}
