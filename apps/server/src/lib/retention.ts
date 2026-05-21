/** Non-user entities: inactive for this long before hard delete (PRD §7.1). */
export const INACTIVE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

export function inactivePurgeCutoff(now = new Date()): Date {
  return new Date(now.getTime() - INACTIVE_RETENTION_MS);
}

export function softDeactivateFields(now = new Date()) {
  return { active: false as const, deactivatedAt: now };
}

export function softActivateFields() {
  return { active: true as const, deactivatedAt: null };
}
