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

## api-server

| 변수 | 설명 |
|------|------|
| `AI_ENABLED` | `1` |
| `LLM_PROVIDER` | 프로덕션: `template` 또는 Groq 등 (Ollama 없음) |
| `DATABASE_URL` | Postgres + pgvector migrate 완료 |

프로덕션 외부 LLM 사용 전 `docs/legal/privacy.md` v5 갱신.

## CORS

`apps/server`는 `cors({ origin: true })` — user-web Railway URL에서 API 호출 가능.

## Google OAuth

Google Cloud Console에 user-web Railway URL을 **승인된 JavaScript 원본** 및 리다이렉트에 등록.

## 로컬 시드 계정

- `user@example.com` / `user123` (`prisma/seed.ts`)
- `apps/user-web/.env.local`: `VITE_DEV_EMAIL`, `VITE_DEV_PASSWORD`
