# Play Store 출시 — 0단계 체크리스트

nouryLog Android(`com.nourylog.app`) Play Store 정식 출시 전 준비 목록입니다.  
코드·문서(에이전트)와 콘솔·비밀값(사용자)을 구분합니다.

## 요약 표

| 항목 | 담당 | 상태 확인 |
|------|------|-----------|
| Play 개발자 계정 ($25) | **HUMAN** | [Play Console](https://play.google.com/console) 등록 |
| 프로덕션 API HTTPS | **HUMAN** 배포 + **에이전트** env 템플릿 | Railway 등 URL 확정 |
| 앱 표시명 nouryLog | **에이전트** | `apps/mobile/app.config.ts` |
| production EAS 빌드 가드 | **에이전트** | API URL / AdMob / Kakao placeholder 차단 |
| Google Play Billing | **에이전트** 코드 + **HUMAN** SKU·서비스 계정 | 구독 ID `premium_monthly` |
| 정책 공개 URL | **에이전트** API + **HUMAN** Play Console 입력 | 아래 URL 형식 |
| SNS release SHA-1 | **HUMAN** | [native-sns-sdk-release-setup.md](../decisions/native-sns-sdk-release-setup.md) |
| EAS Secret 실제 값 | **HUMAN** | 비밀은 레포에 커밋하지 않음 |

---

## HUMAN — Play Console (병행 필수)

1. **개발자 계정** 등록·신원 확인·등록비 결제
2. **앱 만들기** — 패키지명 `com.nourylog.app` (변경 불가)
3. **구독 상품** 생성
   - 제품 ID: `premium_monthly` (앱·서버와 동일)
   - 가격 예: 월 4,900원
4. **API 액세스** — Google Cloud 서비스 계정 생성 후 Play Console에 연결
   - 권한: 재무 데이터 보기, 주문 및 구독 관리(또는 동등)
   - JSON 키 → 서버 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Railway env)
5. **개인정보처리방침 URL** (프로덕션 API 배포 후):
   - `https://{PROD_API}/public/policies/privacy/page`
   - 이용약관: `https://{PROD_API}/public/policies/terms/page`
6. **내부 테스트** 트랙에 AAB 1회 업로드 → 라이선스 테스터로 구독·SNS 검증

---

## HUMAN — EAS Secret (`apps/mobile`)

프로덕션 빌드(`eas build --profile production`) 전에 Expo 대시보드 또는 CLI로 등록:

| Secret 이름 | 설명 |
|-------------|------|
| `EXPO_PUBLIC_API_URL` | `https://` 프로덕션 API |
| `EXPO_PUBLIC_NAVER_CLIENT_ID` | 네이버 SDK |
| `EXPO_PUBLIC_NAVER_CLIENT_SECRET` | 네이버 SDK |
| `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` | 카카오 네이티브 앱 키 (placeholder 금지) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | GCP Web OAuth 클라이언트 ID |
| `ADMOB_ANDROID_APP_ID` | AdMob 앱 ID (Google 샘플 ID 금지) |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | 배너 광고 단위 ID |

```powershell
cd apps/mobile
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://YOUR-API"
```

---

## HUMAN — 서버 프로덕션 env (`apps/server`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` | 32자 이상 |
| `GOOGLE_ALLOWED_AUDIENCES` | 모바일 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 와 동일 |
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.nourylog.app` |
| `GOOGLE_PLAY_SUBSCRIPTION_ID` | `premium_monthly` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play API 서비스 계정 JSON (한 줄 또는 base64) |

로컬 개발만 스텁 검증 허용: `BILLING_SKIP_VERIFY=1` (**production 금지**)

---

## 에이전트 완료 산출물 (코드)

- [app.config.ts](../../apps/mobile/app.config.ts): `nouryLog` 명칭, production 빌드 가드
- [playBilling.ts](../../apps/server/src/lib/playBilling.ts) + [billingPlaySync.ts](../../apps/server/src/lib/billingPlaySync.ts): Play 구독 검증
- `GET /public/policies/:kind/page`: HTML 정책 페이지
- [checkoutPremium.ts](../../apps/mobile/src/billing/checkoutPremium.ts): `react-native-iap` + 서버 연동
- API 계약: [feature-diet-management-api-contract-v1.md](../requirements/feature-diet-management-api-contract-v1.md)

---

## 검증 순서

1. 서버 `npm run build -w @diet-management/server` · `prisma migrate deploy`
2. 모바일 `npx tsc --noEmit` (workspace `mobile`)
3. EAS **development** APK — SNS [회귀 시나리오](../qa/native-sns-sdk-regression.md)
4. EAS **production** AAB — 내부 테스트 트랙 업로드
5. 테스터 계정: 구독 구매 → entitlements · 광고 제거 · OCR 유료 확인

---

## 다음 단계 (1단계 이후)

- 스토어 등록정보·스크린샷·Data safety 설문
- `eas submit` 또는 콘솔 수동 AAB
- 프로덕션 심사 제출

참고: [native-sns-sdk-release-setup.md](../decisions/native-sns-sdk-release-setup.md)
