import { AI_RATE_LIMIT_PER_MIN } from './aiConfig.js';

const buckets = new Map<string, number[]>();

export function checkAiRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const list = buckets.get(userId) ?? [];
  const recent = list.filter((t) => now - t < windowMs);
  if (recent.length >= AI_RATE_LIMIT_PER_MIN) {
    buckets.set(userId, recent);
    return false;
  }
  recent.push(now);
  buckets.set(userId, recent);
  return true;
}
