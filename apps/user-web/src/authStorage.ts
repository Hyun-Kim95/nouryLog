const ACCESS_KEY = 'nourylog-user-access';
const REFRESH_KEY = 'nourylog-user-refresh';

export async function getAccessToken(): Promise<string | null> {
  return localStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return localStorage.getItem(REFRESH_KEY);
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
