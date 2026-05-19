import * as FileSystem from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function resolveImagePickerBase64(asset: ImagePickerAsset): Promise<string | null> {
  if (asset.base64) return asset.base64;
  if (!asset.uri) return null;
  try {
    return await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64',
    });
  } catch {
    return null;
  }
}
