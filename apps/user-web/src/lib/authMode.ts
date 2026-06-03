export type AuthMode = 'demo' | 'social';

const KEY = 'nourylog:authMode';

export function getAuthMode(): AuthMode | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === 'demo' || v === 'social') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setAuthMode(mode: AuthMode): void {
  try {
    sessionStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}

export function clearAuthMode(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
