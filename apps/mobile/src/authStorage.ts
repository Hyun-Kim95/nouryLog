import * as SecureStore from 'expo-secure-store';

const ACCESS = 'dm_access_token';
const REFRESH = 'dm_refresh_token';
const ONBOARDING_DONE = 'dm_onboarding_done';

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(ONBOARDING_DONE);
}

export async function getOnboardingDone(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(ONBOARDING_DONE);
  return v === '1';
}

export async function setOnboardingDone(done: boolean): Promise<void> {
  if (done) {
    await SecureStore.setItemAsync(ONBOARDING_DONE, '1');
  } else {
    await SecureStore.deleteItemAsync(ONBOARDING_DONE);
  }
}
