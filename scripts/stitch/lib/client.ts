import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Stitch, StitchToolClient } from '@google/stitch-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = '7726060931590277332';
const DESIGN_SYSTEM_ASSET_ID = 'assets/1329886661735568102';

function loadApiKey(): string {
  if (process.env.STITCH_API_KEY && process.env.STITCH_API_KEY.trim()) {
    return process.env.STITCH_API_KEY.trim();
  }

  const mcpJsonPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpJsonPath)) {
    throw new Error(
      `Stitch API 키를 찾을 수 없습니다. ${mcpJsonPath} 또는 환경변수 STITCH_API_KEY를 확인해주세요.`,
    );
  }

  const raw = fs.readFileSync(mcpJsonPath, 'utf-8');
  const json = JSON.parse(raw) as {
    mcpServers?: Record<
      string,
      { headers?: Record<string, string>; env?: Record<string, string> }
    >;
  };
  const stitch = json.mcpServers?.stitch;
  const fromEnv = stitch?.env?.STITCH_API_KEY;
  const fromHeaders = stitch?.headers?.['X-Goog-Api-Key'];
  const key = fromEnv ?? fromHeaders;
  if (!key) {
    throw new Error(
      `mcp.json의 mcpServers.stitch.env.STITCH_API_KEY 또는 headers["X-Goog-Api-Key"] 값을 읽을 수 없습니다.`,
    );
  }
  return key;
}

export function createStitch(): { sdk: Stitch; client: StitchToolClient } {
  const apiKey = loadApiKey();
  const client = new StitchToolClient({
    apiKey,
    baseUrl: 'https://stitch.googleapis.com/mcp',
    timeout: 300_000,
  });
  const sdk = new Stitch(client);
  return { sdk, client };
}

export const STITCH = {
  PROJECT_ID,
  DESIGN_SYSTEM_ASSET_ID,
} as const;

export const OUT_DIR = path.join(__dirname, '..', 'out');

export function ensureOutDir(): string {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  return OUT_DIR;
}

export function writeJson(filename: string, payload: unknown): string {
  ensureOutDir();
  const target = path.join(OUT_DIR, filename);
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf-8');
  return target;
}

export function readJson<T>(filename: string): T {
  const target = path.join(OUT_DIR, filename);
  return JSON.parse(fs.readFileSync(target, 'utf-8')) as T;
}
