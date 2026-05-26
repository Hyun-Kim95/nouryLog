import { readAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

/** JSON body 여유를 두고 base64 문자열 상한 (~1.4MB). */
const MAX_BASE64_CHARS = Math.floor(1.4 * 1024 * 1024);

const COMPRESS_STEPS: Array<{ width: number; compress: number }> = [
  { width: 1600, compress: 0.75 },
  { width: 1280, compress: 0.65 },
  { width: 1024, compress: 0.55 },
];

async function readBase64FromUri(uri: string): Promise<string | null> {
  try {
    return await readAsStringAsync(uri, { encoding: 'base64' });
  } catch {
    return null;
  }
}

/**
 * OCR 업로드용: 리사이즈·JPEG 압축 후 base64. 2mb JSON 한도 이하를 목표로 한다.
 */
export async function prepareOcrImageBase64(asset: ImagePickerAsset): Promise<string | null> {
  if (!asset.uri) {
    if (asset.base64 && asset.base64.length <= MAX_BASE64_CHARS) return asset.base64;
    return null;
  }
  const sourceUri = asset.uri;

  for (const step of COMPRESS_STEPS) {
    try {
      const result = await manipulateAsync(
        sourceUri,
        [{ resize: { width: step.width } }],
        { compress: step.compress, format: SaveFormat.JPEG, base64: true },
      );
      const base64 = result.base64 ?? (result.uri ? await readBase64FromUri(result.uri) : null);
      if (base64 && base64.length <= MAX_BASE64_CHARS) {
        return base64;
      }
    } catch {
      // 다음 단계로 더 강하게 압축
    }
  }
  return null;
}
