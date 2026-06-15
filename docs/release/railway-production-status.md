# Railway production — Play Store 준비 상태

마지막 점검: 에이전트 Railway CLI 작업 기준.

## 프로젝트

| 항목 | 값 |
|------|-----|
| 프로젝트 | gregarious-commitment |
| Project ID | `b78fdcaa-4f5c-4c70-89c6-80bc04077e67` |
| Environment | production (`047e6df9-6815-4a7f-888c-966dca7caeec`) |
| api-server URL | https://api-server-production-52bc.up.railway.app |
| admin-web URL | https://admin-web-production-6533.up.railway.app |
| user-web URL | https://user-web-production-d88d.up.railway.app |
| user-web 배포 | `docs/release/user-web-railway-deploy.md`, Config path `/apps/user-web/railway.toml` |

### user-web·식단 인사이트 (2026-06-15)

| 항목 | 상태 |
|------|------|
| `AI_ENABLED` / `LLM_*` (nouryLog-api) | **제거 완료** — 인사이트는 SQL·템플릿만 사용 |
| Google OAuth | **사용자** — JS 원본에 `https://user-web-production-d88d.up.railway.app` 추가 |
| 프로덕션 데모 계정 | `npm run seed:demo-user` + `VITE_DEMO_*` = `user@example.com` / `user123` |

### 식단 인사이트 DB 정리 (2026-06-15)

| 항목 | 상태 |
|------|------|
| 마이그레이션 `20260615120000_drop_ai_rag_tables` | **적용 완료** — `AiQueryLog`·`AiEmbedding`·`vector` 제거 |
| 마이그레이션 `20260615120100_policy_insights_v5` | **적용 완료** — 개인정보처리방침 v5 (시행 2026-07-01, `docs/legal/privacy.md` 동기) |

프로덕션 적용 (기존 Postgres migrate 절차와 동일):

```powershell
cd apps\server
npx @railway/cli run --service Postgres -- cmd /c "set DATABASE_URL=%DATABASE_PUBLIC_URL% && npx prisma migrate deploy"
```

이후 api-server 재배포(`start:release`가 migrate deploy 포함).

```powershell
cd d:\cursor\dietManagement
npx @railway/cli link -p b78fdcaa-4f5c-4c70-89c6-80bc04077e67 -e 047e6df9-6815-4a7f-888c-966dca7caeec -s api-server
```

## 3단계 — DB 마이그레이션

로컬에서 `railway run --service api-server` 는 `postgres.railway.internal` 에 접근하지 못함(P1001).  
프로덕션 DB에는 **Postgres 서비스 env + public proxy** 로 실행:

```powershell
cd apps\server
npx @railway/cli run --service Postgres -- cmd /c "set DATABASE_URL=%DATABASE_PUBLIC_URL% && npx prisma migrate deploy"
```

결과: **22 migrations, No pending migrations to apply** (`PlaySubscriptionPurchase` 포함).

이후 배포 시 자동 migrate: [`apps/server/package.json`](../../apps/server/package.json) `start:release` + Railway Start Command (아래).

## 4단계 — api-server 환경 변수

### 에이전트 설정 완료

| 변수 | 값 |
|------|-----|
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.nourylog.app` |
| `GOOGLE_PLAY_SUBSCRIPTION_ID` | `premium_monthly` |

### 사용자 설정 필요 (비밀)

| 변수 | 상태 | 조치 |
|------|------|------|
| `JWT_SECRET` | 미설정 | Railway → api-server → 32자 이상 랜덤 문자열 |
| `GOOGLE_ALLOWED_AUDIENCES` | 미설정 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 와 동일 값 |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | 미설정 | Play Console API 연동 후 JSON (stdin set, 채팅 금지) |

### 이미 있음 (이름만)

`DATABASE_URL`, `OCR_API_*`, `OCR_FREE_LIMIT_NORMAL`/`REDUCED`/`USER_THRESHOLD`, `NAVER_*`, `KAKAO_*`, `GOOGLE_CLIENT_*`, `OAUTH_*`, `NODE_ENV` 등.  
구 `OCR_FREE_LIMIT` 는 제거. 배포 후 migrate: `20260519140000_ocr_monthly_quota`, `20260520120000_policy_free_launch_v2`(약관·개인정보 v2).

`BILLING_SKIP_VERIFY` 는 production 에 **넣지 않음**.

변수 설정 후 api-server **재배포** 필요 (`--skip-deploys` 로 넣었을 경우).

## 프로덕션 HTTP 검증 (정책)

| URL | HTTP |
|------|------|
| `/public/policies/privacy/page` | 200 |
| `/public/policies/terms/page` | 200 |
| `/public/policies/privacy` (JSON) | 200 |
| `/public/policies/terms` (JSON) | 200 |

Play Console 입력용:

- https://api-server-production-52bc.up.railway.app/public/policies/privacy/page
- https://api-server-production-52bc.up.railway.app/public/policies/terms/page

## Railway Start Command (권장)

api-server → Settings → Start Command:

```bash
npm run start:release -w @diet-management/server
```

또는 서비스 루트가 `apps/server` 이면:

```bash
npx prisma migrate deploy && node dist/index.js
```

모노레포 루트 빌드인 경우 Railway 대시보드의 Root Directory / Build 설정과 맞출 것.

## EAS (모바일)

고정값:

```
EXPO_PUBLIC_API_URL=https://api-server-production-52bc.up.railway.app
```

나머지 Secret: [play-store-phase0.md](./play-store-phase0.md)

## HUMAN — 다음 작업 (순서)

1. Railway: `JWT_SECRET`, `GOOGLE_ALLOWED_AUDIENCES` 설정 → api-server 재배포
2. Play Console: 구독 `premium_monthly`, API 서비스 계정 → JSON → `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
3. EAS Secret 전체 + `eas build --profile production --platform android`
4. release SHA-1 → 네이버/카카오/GCP ([native-sns-sdk-release-setup.md](../decisions/native-sns-sdk-release-setup.md))
5. Play 내부 테스트 AAB + [native-sns-sdk-regression.md](../qa/native-sns-sdk-regression.md) + 구독 1회

### Play SA JSON Railway 반영 (값은 채팅에 붙이지 말 것)

```powershell
Get-Content C:\path\to\play-sa.json -Raw | npx @railway/cli variable set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --stdin --service api-server
npx @railway/cli redeploy --service api-server -y
```

## 내부 테스트 검증 체크리스트

- [ ] 내부 테스트 트랙에 production AAB 업로드
- [ ] 라이선스 테스터 Gmail 등록
- [ ] 네이버/카카오/구글 로그인 (release SHA-1)
- [ ] 구독 구매 → 프리미엄 활성·광고 제거
- [ ] 구매 복구
- [ ] OCR 쿼터 소진 시 Paywall → 구독

실패 시: `npx @railway/cli logs --service api-server`
