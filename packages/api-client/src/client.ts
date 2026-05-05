import createClient from 'openapi-fetch';
import type { paths } from './generated/schema.js';
import { API_CONTRACT_VERSION } from './version.js';

export type DietPathsClient = ReturnType<typeof createClient<paths>>;

/** openapi-fetch 클라이언트 — baseUrl은 후행 슬래시 없이 (예: http://localhost:3000 또는 /api 프록시) */
export function createDietApiClient(baseUrl: string) {
  const client = createClient<paths>({ baseUrl: baseUrl.replace(/\/$/, '') });
  return {
    apiContractVersion: API_CONTRACT_VERSION,
    raw: client,
  };
}

export type { paths, components } from './generated/schema.js';
