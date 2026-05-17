import * as SecureStore from 'expo-secure-store';

const ACCESS = 'dm_access_token';
const REFRESH = 'dm_refresh_token';
const CURRENT_USER = 'dm_current_user_id';
/** @deprecated 계정별 키로 대체됨 — 마이그레이션 후 삭제 */
const ONBOARDING_DONE_LEGACY = 'dm_onboarding_done';

function onboardingKey(userId: string) {
  return `dm_onboarding_done:${userId}`;
}

export function parseUserIdFromAccessToken(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { sub?: string; userId?: string };
    if (typeof json.sub === 'string' && json.sub) return json.sub;
    if (typeof json.userId === 'string' && json.userId) return json.userId;
    return null;
  } catch {
    return null;
  }
}

export async function rememberUserId(userId: string) {
  await SecureStore.setItemAsync(CURRENT_USER, userId);
}

async function resolveUserId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  return SecureStore.getItemAsync(CURRENT_USER);
}

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
  const userId = parseUserIdFromAccessToken(access);
  if (userId) await rememberUserId(userId);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(CURRENT_USER);
  await SecureStore.deleteItemAsync(ONBOARDING_DONE_LEGACY);
}

export async function getOnboardingDone(userId?: string): Promise<boolean> {
  const uid = await resolveUserId(userId);
  if (uid) {
    const v = await SecureStore.getItemAsync(onboardingKey(uid));
    if (v === '1') return true;
  }
  const legacy = await SecureStore.getItemAsync(ONBOARDING_DONE_LEGACY);
  return legacy === '1';
}

export async function setOnboardingDone(done: boolean, userId?: string): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) {
    if (done) await SecureStore.setItemAsync(ONBOARDING_DONE_LEGACY, '1');
    else await SecureStore.deleteItemAsync(ONBOARDING_DONE_LEGACY);
    return;
  }
  if (done) {
    await SecureStore.setItemAsync(onboardingKey(uid), '1');
    await SecureStore.deleteItemAsync(ONBOARDING_DONE_LEGACY);
  } else {
    await SecureStore.deleteItemAsync(onboardingKey(uid));
  }
}
