# user-web Railway 배포

## 신규 서비스

| 항목 | 값 |
|------|-----|
| 서비스명(권장) | `user-web` |
| 루트 디렉터리 | 저장소 루트 (`dietManagement`) |
| Build | `npm run build -w @diet-management/user-web` (의존성은 Railpack install — **빌드에 `npm ci` 중복 금지**, EBUSY) |
| Start | `npm run preview -w @diet-management/user-web -- --host 0.0.0.0 --port $PORT` |
| Config as Code (권장) | 서비스 설정 → **Config file path**: `/apps/user-web/railway.toml` ([`apps/user-web/railway.toml`](../../apps/user-web/railway.toml)) |

## 환경 변수 (user-web)

| 변수 | 예시 |
|------|------|
| `VITE_API_BASE` | `https://api-server-production-52bc.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 웹 클라이언트 ID |
| `PORT` | Railway 자동 |

## api-server (연동)

| 변수 | 권장 값 |
|------|---------|
| `AI_ENABLED` | `1` |
| `LLM_PROVIDER` | `template` (Railway에 Ollama 없음) |
| `DATABASE_URL` | Postgres + pgvector migrate 완료 |

프로덕션 외부 LLM 사용 전 `docs/legal/privacy.md` v5 갱신.

## CORS

`apps/server`는 `cors({ origin: true })` — user-web Railway URL에서 API 호출 가능.

## Google OAuth

Google Cloud Console에 user-web Railway URL을 **승인된 JavaScript 원본** 및 리다이렉트에 등록.

## 프로덕션 URL (2026-06-04)

- https://user-web-production-d88d.up.railway.app
- 시연 로그인: `/demo` 또는 `/demo?auto=1` (Railway 변수 `VITE_DEMO_*` 설정 시)

## 프로덕션 KB 인덱스 (api-server 배포·`AI_ENABLED=1` 후 1회)

로컬에서 Postgres **public** URL로 실행 (내부 `postgres.railway.internal` 은 로컬에서 불가):

```powershell
cd d:\cursor\dietManagement
# DATABASE_PUBLIC_URL 은 Railway → Postgres → Variables 에서 복사
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
$env:AI_ENABLED = "1"
npm run ai:seed-kb
```

또는 `npm install` 후 `npx tsx apps/server/scripts/seed-nutrition-kb.mjs` 동일 env.

## 로컬 시드 계정

- `user@example.com` / `user123` (`prisma/seed.ts`)
- `apps/user-web/.env.local`: `VITE_DEV_EMAIL`, `VITE_DEV_PASSWORD`
