const CLIENT_REQUEST_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `POST /meals` 멱등 키. UUID v4 형식만 허용한다. */
export function parseMealClientRequestId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 64) return null;
  if (!CLIENT_REQUEST_ID_RE.test(trimmed)) return null;
  return trimmed;
}
