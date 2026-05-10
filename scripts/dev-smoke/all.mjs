#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 통합 dev smoke 러너.
 *
 * 사용법:
 *   1) `npm run dev:server` 가 떠 있어야 한다 (기본 http://localhost:3000).
 *   2) `npm run smoke:dev` 또는 `node scripts/dev-smoke/all.mjs` 실행.
 *
 * 동작:
 *   - dev smoke 단계들을 순차 실행한다.
 *     1단계: phase-n.mjs (v1.1~v1.3 회귀, 14 케이스)
 *     2단계: phase-p.mjs (v1.4 권장 계산 분기, 9 케이스)
 *     3단계: phase-t.mjs (사용자 override 입력, 6 케이스)
 *     4단계: phase-q-admin.mjs (관리자 화면 수정사항 회귀, 14 케이스)
 *   - 각 단계의 stdout/stderr는 그대로 라이브로 흘려보낸다.
 *   - 어느 단계가 실패했는지를 명시적으로 출력하고, 실패가 있으면 exit 1.
 *   - PHASE_SMOKE_BASE 환경변수가 설정돼 있으면 각 스크립트에 그대로 전달한다(각자의 env name을 본다).
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STAGES = [
  {
    label: 'phase-n (v1.1~v1.3 regression, 14 cases)',
    script: resolve(__dirname, 'phase-n.mjs'),
    envName: 'PHASE_N_BASE',
  },
  {
    label: 'phase-p (v1.4 recommendation branches, 9 cases)',
    script: resolve(__dirname, 'phase-p.mjs'),
    envName: 'PHASE_P_BASE',
  },
  {
    label: 'phase-t (override input, 6 cases)',
    script: resolve(__dirname, 'phase-t.mjs'),
    envName: 'PHASE_T_BASE',
  },
  {
    label: 'phase-q-admin (admin web fixes, 28 cases)',
    script: resolve(__dirname, 'phase-q-admin.mjs'),
    envName: 'PHASE_Q_ADMIN_BASE',
  },
];

const SHARED_BASE = process.env.PHASE_SMOKE_BASE;

function runStage({ label, script, envName }) {
  return new Promise((resolveStage) => {
    console.log('');
    console.log('='.repeat(72));
    console.log(`>> ${label}`);
    console.log('='.repeat(72));
    const env = { ...process.env };
    if (SHARED_BASE && !env[envName]) env[envName] = SHARED_BASE;
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      env,
    });
    child.on('close', (code) => {
      resolveStage({ label, code: code ?? 1 });
    });
  });
}

async function main() {
  const results = [];
  for (const stage of STAGES) {
    const result = await runStage(stage);
    results.push(result);
    if (result.code !== 0) {
      console.log('');
      console.log(`!! Stage failed: ${stage.label} (exit ${result.code}). Skipping remaining stages.`);
      break;
    }
  }

  console.log('');
  console.log('='.repeat(72));
  console.log('Combined dev smoke summary');
  console.log('='.repeat(72));
  const total = STAGES.length;
  for (const stage of STAGES) {
    const result = results.find((r) => r.label === stage.label);
    if (!result) {
      console.log(`  - ${stage.label}: SKIPPED`);
      continue;
    }
    const tag = result.code === 0 ? 'PASS' : 'FAIL';
    console.log(`  - ${stage.label}: ${tag} (exit ${result.code})`);
  }

  const failed = results.find((r) => r.code !== 0);
  if (failed) {
    console.log('');
    console.log(`Result: FAIL (${failed.label})`);
    process.exitCode = 1;
    return;
  }

  if (results.length < total) {
    process.exitCode = 1;
    return;
  }

  console.log('');
  console.log('Result: PASS (all stages green)');
}

main().catch((e) => {
  console.error('UNCAUGHT', e);
  process.exitCode = 2;
});
