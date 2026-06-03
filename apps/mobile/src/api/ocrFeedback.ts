import { apiFetch } from '../api';

export type OcrNutritionPayload = {
  calories?: number;
  protein?: number;
  carbohydrate?: number;
  fat?: number;
  rawText?: string;
};

export async function postOcrFeedback(
  token: string,
  body: {
    rawOcr: OcrNutritionPayload;
    corrected: OcrNutritionPayload;
    mealId?: string;
    imageHash?: string;
    confidence?: number;
  },
): Promise<void> {
  await apiFetch('/ocr/feedback', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}
