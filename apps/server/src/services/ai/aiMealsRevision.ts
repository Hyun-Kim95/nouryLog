import { prisma } from '../../lib/prisma.js';

/** 해당 기간 식단 집계 결과가 바뀌었는지 판별하는 revision (캐시 무효화용) */
export async function getMealsRevision(
  userId: string,
  from: Date,
  toExclusive: Date,
): Promise<string> {
  const agg = await prisma.meal.aggregate({
    where: {
      userId,
      consumedAt: { gte: from, lt: toExclusive },
    },
    _count: { _all: true },
    _max: { createdAt: true, deactivatedAt: true },
  });

  const activeAgg = await prisma.meal.aggregate({
    where: {
      userId,
      active: true,
      consumedAt: { gte: from, lt: toExclusive },
    },
    _count: { _all: true },
  });

  const maxCreated = agg._max.createdAt?.toISOString() ?? '';
  const maxDeactivated = agg._max.deactivatedAt?.toISOString() ?? '';
  return `a${activeAgg._count._all}:t${agg._count._all}:c${maxCreated}:d${maxDeactivated}`;
}
