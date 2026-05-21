import type { PrismaClient } from '@prisma/client';
import { inactivePurgeCutoff } from './retention.js';

export type PurgeInactiveResult = {
  cutoff: string;
  deleted: {
    meals: number;
    foodTemplates: number;
    inquiries: number;
    notices: number;
    users: number;
  };
};

/**
 * Hard-deletes rows inactive for at least 1 year (deactivatedAt + 1년).
 * Audit/ops logs are not in schema yet — skipped per PRD.
 */
export async function runPurgeInactive(
  client: PrismaClient,
  now = new Date(),
): Promise<PurgeInactiveResult> {
  const cutoff = inactivePurgeCutoff(now);
  const where = {
    active: false,
    deactivatedAt: { not: null, lte: cutoff },
  } as const;

  const [meals, foodTemplates, inquiries, notices, users] = await client.$transaction([
    client.meal.deleteMany({ where }),
    client.foodTemplate.deleteMany({ where }),
    client.inquiry.deleteMany({ where }),
    client.notice.deleteMany({ where }),
    client.user.deleteMany({
      where: { ...where, role: 'USER' },
    }),
  ]);

  return {
    cutoff: cutoff.toISOString(),
    deleted: {
      meals: meals.count,
      foodTemplates: foodTemplates.count,
      inquiries: inquiries.count,
      notices: notices.count,
      users: users.count,
    },
  };
}
