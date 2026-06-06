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

api-server에 `GOOGLE_ALLOWED_AUDIENCES`에 동일 웹 클라이언트 ID를 포함해야 idToken 교환이 통과한다.

## Kakao (웹)

| 항목 | 값 |
|------|-----|
| SDK URL (코드) | `https://t1.kakaocdn.net/kakao_js_sdk/v1/kakao.min.js` — 구 `kakao/v2/kakao.min.js`는 CDN **403** |
| Railway | `VITE_KAKAO_JAVASCRIPT_KEY` = 앱 **JavaScript 키** (REST 키 아님) |
| Kakao Developers | [앱] → 플랫폼 **Web** 추가 → 사이트 도메인에 `https://user-web-production-d88d.up.railway.app` |
| Redirect URI | 카카오 로그인 → Redirect URI에 동일 origin 등록 |

변경 후 **user-web 재배포** 필수 (`VITE_*`는 빌드타임).

## Naver (웹)

| Railway | `VITE_NAVER_CLIENT_ID`, `VITE_NAVER_REDIRECT_URI` |
| Naver Developers | Callback URL = `https://user-web-production-d88d.up.railway.app/demo/oauth/naver` |

## 프로덕션 URL (2026-06-04)

- https://user-web-production-d88d.up.railway.app
- 시연 로그인: `/demo` 또는 `/demo?auto=1` (Railway 변수 `VITE_DEMO_*` 설정 시)

## 프로덕션 데모 계정 (user-web 시연)

| 항목 | 값 |
|------|-----|
| 이메일 | `user@example.com` |
| 비밀번호 | `user123` |
| Railway (빌드타임) | `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD` — 위와 **동일**해야 `/demo?auto=1` 동작 |
| SSOT 코드 | [`apps/server/prisma/seedDemoUser.ts`](../../apps/server/prisma/seedDemoUser.ts) |

프로덕션 DB에 계정·42일 식단 시드 (비밀번호 재설정·비활성 복구 포함):

```powershell
cd d:\cursor\dietManagement
npm run db:generate
# Railway → Postgres → Variables → DATABASE_PUBLIC_URL
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
npm run seed:demo-user
```

- 기본: 기존 `user@example.com` 이 있어도 **비밀번호를 `user123`으로 맞춤** (`SEED_DEMO_RESET_PASSWORD=0` 이면 비밀번호 유지).
- 식단: `__nourylog_demo_seed__` 노트 기록만 삭제 후 재생성(다른 meal은 유지).

## 프로덕션 KB 인덱스 (api-server 배포·`AI_ENABLED=1` 후 1회)

```powershell
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
$env:AI_ENABLED = "1"
npm run ai:seed-kb
```

## 로컬

- 전체 시드: `npm run prisma:seed -w @diet-management/server`
- 데모만: `npm run seed:demo-user`
- `apps/user-web/.env.local`: `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` (또는 `VITE_DEV_*`)
