export const OCR_FREE_LIMIT = Number(process.env.OCR_FREE_LIMIT ?? 5);
export const STATS_STALE_HOURS = Number(process.env.STATS_STALE_HOURS ?? 6);
export const OCR_PROVIDER = String(process.env.OCR_PROVIDER ?? 'google_vision');
export const OCR_API_KEY = String(process.env.OCR_API_KEY ?? '');
export const OCR_API_URL = String(process.env.OCR_API_URL ?? 'https://vision.googleapis.com/v1/images:annotate');
