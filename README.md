# nouryLog

식단 기록과 영양 분석을 위한 앱/관리자 웹 통합 프로젝트입니다.

## 프로젝트 구성

- `apps/server`: Express + Prisma(PostgreSQL) API 서버
- `apps/mobile`: Expo(React Native) 모바일 앱
- `apps/admin-web`: Vite + React 관리자 웹
- `packages/api-client`: OpenAPI 기반 타입/클라이언트 패키지

## 핵심 기능

- 음식 기록 생성/조회/수정/비활성화
- OCR 기반 영양성분 인식(실 API 연동)
- 통계 조회(`isStale`, `staleHours` 포함)
- 구독/광고 게이트(기본 정책 반영)
- 관리자 대시보드 및 목록 관리(회원/음식/문의/공지)

## 빠른 실행

```bash
npm install
npm run dev:server
npm run dev:admin
npm run dev:mobile
npm run dev:user-web
```

모바일 에뮬레이터 테스트 시 `apps/mobile/.env`의 `EXPO_PUBLIC_API_URL`을 환경에 맞게 사용합니다.

## 식단 인사이트 (user-web 미리보기 + 모바일)

| 기능 | user-web | 모바일 |
|------|----------|--------|
| 주간 식단 리포트 | `/insights/weekly` | 식단 인사이트 |
| 월간 영양 패턴 | `/insights/monthly` | 통계 · 월 |
| 요약 대시보드 | `/insights` | 홈 · 식단 인사이트 |

로컬: `dev:server` + `dev:user-web` (5175). 자동 로그인 `http://localhost:5175/demo?auto=1` — 상단 네비에 **주간·월간·식단 인사이트**만 표시.  
`VITE_DEV_API_TARGET=http://localhost:3002` 등 서버 포트 맞출 것. 스모크: `npm run insights:smoke:summary` (서버 기동 후).

### user-web 로그인 env (`apps/user-web/.env.local`)

| 변수 | 용도 |
|------|------|
| `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` | 데모 로그인 (`user@example.com` / `user123` — `npm run seed:demo-user`) |
| `VITE_GOOGLE_CLIENT_ID` | Google SNS |
| `VITE_KAKAO_JAVASCRIPT_KEY` | Kakao JS SDK |
| `VITE_NAVER_CLIENT_ID` + `VITE_NAVER_REDIRECT_URI` | Naver 웹 OAuth (`/demo/oauth/naver`) |

서버: `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` (네이버 code 교환).

## SNS 로그인 설정 (모바일 — 네이티브 SDK 방식)

모바일 앱은 안드로이드에서 **네이버/카카오/구글 네이티브 SDK** 로 로그인하고, 그 결과 토큰을 서버 `POST /auth/social/:provider/exchange` 로 보내 우리 서비스의 access/refresh 토큰을 받습니다. 기존 Chrome Custom Tab + 서버 OAuth(`/start`·`/callback`) 흐름은 사용하지 않습니다.

### 사전 준비

- 모바일은 **EAS Development Build** 가 필수입니다. Expo Go 에서는 네이티브 모듈이 동작하지 않습니다.
- `apps/mobile/app.config.ts` 의 `android.package` (`com.nourylog.app`) 와 debug/release **SHA-1** 을 각 콘솔에 등록해야 합니다.

### 모바일 환경 변수 (`apps/mobile/.env`)

- `EXPO_PUBLIC_NAVER_CLIENT_ID`, `EXPO_PUBLIC_NAVER_CLIENT_SECRET`
- `EXPO_PUBLIC_NAVER_APP_NAME` (기본 `nouryLog`)
- `EXPO_PUBLIC_NAVER_IOS_URL_SCHEME` (iOS 콘솔에서 발급, 안드로이드는 사용 안 함)
- `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` (카카오 디벨로퍼스의 **네이티브 앱 키**)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (GCP OAuth 의 **Web** 클라이언트 ID, 서버 검증과 동일 값)

### 서버 환경 변수 (`apps/server/.env`)

- `OAUTH_STATE_SECRET` — 이메일 충돌 토큰 JWT 서명 시크릿
- `GOOGLE_ALLOWED_AUDIENCES` — 구글 idToken `aud` 허용 목록(쉼표 구분). 비어 있으면 검증 건너뜀(로컬 전용).

> 서버는 네이버/카카오 secret 을 더 이상 보유하지 않습니다. provider 토큰은 클라이언트(SDK)가 직접 받아 서버에 전달합니다.

### 콘솔 등록 요약

- **네이버 개발자센터**: Application > 환경 추가 > Android > 패키지명 `com.nourylog.app` + debug SHA-1 (출시 전 release SHA-1 추가).
- **카카오 디벨로퍼스**: 내 애플리케이션 > 플랫폼 > Android > 패키지명 + 키 해시(Base64(SHA-1)). 카카오 로그인 활성화.
- **GCP Console**: OAuth 동의 화면 + OAuth 클라이언트 2종 (Android: 패키지명 + SHA-1 / Web: idToken 검증용 — 모바일은 Web 클라이언트 ID를 사용).

### 회귀 시나리오

`docs/qa/native-sns-sdk-regression.md` 의 3사 × 4 시나리오를 통과해야 합니다.

## Play Store 출시 (Android)

0단계 체크리스트·EAS Secret·Play Billing: [`docs/release/play-store-phase0.md`](docs/release/play-store-phase0.md)  
Railway production 상태·env: [`docs/release/railway-production-status.md`](docs/release/railway-production-status.md)

