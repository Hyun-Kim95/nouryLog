import { OCR_API_KEY, OCR_API_URL, OCR_PROVIDER } from '../lib/config.js';
import { parseNutritionFromText, type ParsedNutrition } from './nutritionParser.js';

type OcrInput = {
  imageBase64?: string;
  imageUrl?: string;
};

async function fetchGoogleVisionText(input: OcrInput): Promise<string> {
  if (!OCR_API_KEY) {
    throw new Error('missing_ocr_api_key');
  }
  if (!input.imageBase64 && !input.imageUrl) {
    throw new Error('missing_ocr_image_input');
  }

  const body = {
    requests: [
      {
        image: input.imageBase64 ? { content: input.imageBase64 } : { source: { imageUri: input.imageUrl } },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      },
    ],
  };

  const url = `${OCR_API_URL}?key=${encodeURIComponent(OCR_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawBody = await res.text();
  if (res.status === 429) throw new Error('ocr_rate_limit');
  if (!res.ok) {
    let reason = `http_${res.status}`;
    try {
      const errJson = JSON.parse(rawBody) as {
        error?: {
          message?: string;
          status?: string;
          details?: Array<{ reason?: string }>;
        };
      };
      const detailReason = errJson.error?.details?.find((d) => d.reason)?.reason;
      reason = detailReason ?? errJson.error?.status ?? errJson.error?.message ?? reason;
      if (process.env.OCR_DEBUG === '1') {
        console.warn('[ocr] vision request failed', {
          httpStatus: res.status,
          reason,
          message: errJson.error?.message,
        });
      }
    } catch {
      if (process.env.OCR_DEBUG === '1') {
        console.warn('[ocr] vision request failed', { httpStatus: res.status, bodyPreview: rawBody.slice(0, 200) });
      }
    }
    throw new Error(`ocr_provider_unavailable:${reason}`);
  }

  const data = JSON.parse(rawBody) as {
    responses?: Array<{ fullTextAnnotation?: { text?: string }; error?: { message?: string } }>;
  };
  const first = data.responses?.[0];
  if (first?.error?.message) throw new Error(`ocr_provider_unavailable:${first.error.message}`);
  const text = first?.fullTextAnnotation?.text?.trim() ?? '';
  if (!text) throw new Error('ocr_parse_failed');
  return text;
}

export type DetectNutritionResult = ParsedNutrition & {
  /** Vision OCR 원문(최대 2KB). 피드백·RAG 인덱싱용 */
  rawText: string;
};

export async function detectNutrition(input: OcrInput): Promise<DetectNutritionResult> {
  if (OCR_PROVIDER !== 'google_vision') {
    throw new Error('unsupported_ocr_provider');
  }
  const text = await fetchGoogleVisionText(input);
  const parsed = parseNutritionFromText(text);
  if (parsed.missingFields.length === 4) {
    throw new Error('ocr_parse_failed');
  }
  return { ...parsed, rawText: text.slice(0, 2000) };
}
