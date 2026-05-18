import * as SecureStore from 'expo-secure-store';

const THEME_MODE_KEY = 'dm_theme_mode';
const WEIGHT_PROMPT_DISMISSED_KEY = 'dm_weight_prompt_dismissed_ymd';

export type StoredThemeMode = 'light' | 'dark';

export async function getThemeMode(): Promise<StoredThemeMode | null> {
  try {
    const v = await SecureStore.getItemAsync(THEME_MODE_KEY);
    if (v === 'light' || v === 'dark') return v;
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[userPrefs] getThemeMode failed', e);
    return null;
  }
}

export async function setThemeModeStored(mode: StoredThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  } catch (e) {
    if (__DEV__) console.warn('[userPrefs] setThemeModeStored failed', e);
  }
}

export async function getWeightPromptDismissedYmd(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(WEIGHT_PROMPT_DISMISSED_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[userPrefs] getWeightPromptDismissedYmd failed', e);
    return null;
  }
}

export async function setWeightPromptDismissedYmd(ymd: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(WEIGHT_PROMPT_DISMISSED_KEY, ymd);
  } catch (e) {
    if (__DEV__) console.warn('[userPrefs] setWeightPromptDismissedYmd failed', e);
  }
}
