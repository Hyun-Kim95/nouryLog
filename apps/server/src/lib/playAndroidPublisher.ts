import { google, type androidpublisher_v3 } from 'googleapis';

export function loadServiceAccountJson(raw: string): object {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is empty');
  }
  try {
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed) as object;
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    return JSON.parse(decoded) as object;
  } catch {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be JSON or base64-encoded JSON');
  }
}

export function getPlayPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || 'com.nourylog.app';
}

export function getPlayServiceAccountJson(): string {
  return process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim() ?? '';
}

export function isPlayServiceAccountConfigured(): boolean {
  return Boolean(getPlayServiceAccountJson());
}

export function createAndroidPublisher(serviceAccountJson: string): androidpublisher_v3.Androidpublisher {
  const credentials = loadServiceAccountJson(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

export function getAndroidPublisherClient(): androidpublisher_v3.Androidpublisher | null {
  const serviceAccountJson = getPlayServiceAccountJson();
  if (!serviceAccountJson) return null;
  return createAndroidPublisher(serviceAccountJson);
}
