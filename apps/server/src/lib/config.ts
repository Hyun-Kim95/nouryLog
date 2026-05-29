function readEnv(name: string, fallback = ''): string {
  const raw = process.env[name] ?? fallback;
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

export const STATS_STALE_HOURS = Number(process.env.STATS_STALE_HOURS ?? 6);
export const APP_ANDROID_MIN_VERSION = readEnv('APP_ANDROID_MIN_VERSION', '1.0.0');
export const APP_ANDROID_MIN_VERSION_CODE = Number(readEnv('APP_ANDROID_MIN_VERSION_CODE', '0')) || 0;
/** Play API 실패 시에만 권장 업데이트 semver fallback */
export const APP_ANDROID_LATEST_VERSION = readEnv('APP_ANDROID_LATEST_VERSION', '1.0.0');
export const APP_ANDROID_STORE_URL = readEnv(
  'APP_ANDROID_STORE_URL',
  'https://play.google.com/store/apps/details?id=com.nourylog.app',
);
export const OCR_PROVIDER = readEnv('OCR_PROVIDER', 'google_vision');
export const OCR_API_KEY = readEnv('OCR_API_KEY');
export const OCR_API_URL = readEnv('OCR_API_URL', 'https://vision.googleapis.com/v1/images:annotate');
