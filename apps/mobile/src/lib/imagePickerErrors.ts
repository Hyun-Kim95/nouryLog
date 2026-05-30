import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LOG_COPY } from '../copy/log';

export function mapImagePickerError(message: string, source: 'camera' | 'library'): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('exponentimagepicker') ||
    lower.includes('rejected') ||
    lower.includes('launchimagelibrary') ||
    lower.includes('launchcamera')
  ) {
    return source === 'camera' ? LOG_COPY.ocrCameraFailed : LOG_COPY.ocrAlbumFailed;
  }
  if (lower.includes('카메라') || lower.includes('camera')) {
    return LOG_COPY.ocrCameraPermissionDenied;
  }
  if (lower.includes('갤러리') || lower.includes('photo') || lower.includes('media')) {
    return LOG_COPY.ocrAlbumPermissionDenied;
  }
  return message;
}

export async function ensureCameraPermissionForPicker(): Promise<void> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.granted) return;
  if (perm.canAskAgain === false) {
    throw new Error(LOG_COPY.ocrCameraPermissionSettings);
  }
  throw new Error(LOG_COPY.ocrCameraPermissionDenied);
}

/** Android 13+ uses system photo picker without broad gallery permission. */
export async function ensureLibraryPermissionForPicker(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 33) return;

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.granted) return;
  if (perm.canAskAgain === false) {
    throw new Error(LOG_COPY.ocrAlbumPermissionSettings);
  }
  throw new Error(LOG_COPY.ocrAlbumPermissionDenied);
}

export function logImagePickerFailure(source: 'camera' | 'library', err: unknown): void {
  if (!__DEV__) return;
  console.warn('[image-picker]', source, {
    androidApi: Platform.OS === 'android' ? Platform.Version : undefined,
    err,
  });
}
