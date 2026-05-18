import * as SecureStore from 'expo-secure-store';

const ACCESS = 'dm_access_token';
const REFRESH = 'dm_refresh_token';
const CURRENT_USER = 'dm_current_user_id';
/** @deprecated 계정별 키로 대체됨 — 마이그레이션 후 삭제 */
const ONBOARDING_DONE_LEGACY = 'dm_onboarding_done';

/** SecureStore 키는 `[A-Za-z0-9._-]` 만 허용 — `:` 사용 불가 */
function onboardingKey(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `dm_onboarding_done_${safe}`;
}

function decodeBase64Utf8(padded: string): string | null {
  if (typeof globalThis.atob !== 'function') return null;
  return globalThis.atob(padded);
}

export function parseUserIdFromAccessToken(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = decodeBase64Utf8(padded);
    if (!decoded) return null;
    const json = JSON.parse(decoded) as { sub?: string; userId?: string };
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
  const uid = await SecureStore.getItemAsync(CURRENT_USER);
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  if (uid) {
    await SecureStore.deleteItemAsync(onboardingKey(uid));
  }
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
