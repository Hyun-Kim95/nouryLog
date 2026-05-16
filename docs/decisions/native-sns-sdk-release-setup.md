# 네이티브 SNS SDK — 출시 빌드 / 콘솔 등록 가이드

## 목적
EAS Build 로 생성한 안드로이드 dev/release 빌드의 **SHA-1 키 해시**를 네이버/카카오/GCP 콘솔에 등록해, 네이티브 SDK 로그인이 동작하도록 한다.

## 1) EAS 초기화 (1회)

```powershell
# 루트에서
npm install
cd apps/mobile
npx eas-cli login
npx eas-cli init   # 슬러그/프로젝트 ID 생성
```

`projectId` 가 `apps/mobile/app.config.ts` (또는 `extra.eas.projectId`) 에 자동 반영된다. 별도 푸시 토큰이 없어도 SDK 빌드에는 영향 없다.

## 2) 안드로이드 Development Build

```powershell
cd apps/mobile
npx eas-cli build --profile development --platform android
```

빌드가 끝나면 APK 다운로드 링크가 출력된다. 테스트 폰에 설치하고, Metro 가 `npm run dev:mobile` 로 떠 있는 상태에서 앱을 실행하면 Dev Client 가 붙는다.

**확인 항목:**
- 기존 화면(로그인 외 모든 탭)이 정상 동작.
- 로그인 화면에서 SNS 버튼을 눌렀을 때 어댑터 콘솔 로그(`[social-naver]`, `[social-kakao]`, `[social-google]`)가 보이고, 미설정 환경변수가 있으면 `missing_env` 경고가 뜬다.

## 3) Debug SHA-1 확보

```powershell
# EAS 가 자동 생성한 안드로이드 keystore 확인
cd apps/mobile
npx eas-cli credentials
# Android > Keystore: Manage everything needed to build your project
# 메뉴에서 SHA-1 Fingerprint 를 복사한다.
```

EAS 가 발급한 **debug**(개발용) SHA-1 과, 추후 **release**(출시용) SHA-1 두 가지를 모두 콘솔에 등록해야 한다.

## 4) 콘솔 등록

### 4.1 네이버 (개발자센터)
1. https://developers.naver.com > Application > 본 앱.
2. 환경 추가 > Android.
3. 패키지명: `com.nourylog.app`.
4. 마켓 URL: 임시값 가능.
5. SHA-1 키 해시: debug SHA-1 (release 빌드 시 release SHA-1 도 추가).

### 4.2 카카오 (디벨로퍼스)
1. https://developers.kakao.com > 내 애플리케이션.
2. 플랫폼 > Android 등록.
3. 패키지명: `com.nourylog.app`.
4. 키 해시: **Base64(SHA-1)** 형식. 예) `keytool -exportcert -alias upload -keystore ... | openssl sha1 -binary | openssl base64`.
   - EAS 의 credentials 명령은 raw SHA-1 만 출력하므로, 별도로 Base64 변환이 필요하다. EAS CLI 로 keystore 를 다운로드 받은 뒤 위 명령을 쓰면 된다.
5. 카카오 로그인 > 활성화 ON.
6. (선택) 동의 항목에서 **이메일** 을 필수로 설정.

### 4.3 구글 (GCP Console)
1. https://console.cloud.google.com > APIs & Services > Credentials.
2. OAuth 동의 화면이 게시(또는 테스트 사용자 추가) 상태인지 확인.
3. **OAuth 2.0 클라이언트 ID 2개**:
   - **Android**: 패키지명 `com.nourylog.app` + debug/release SHA-1.
   - **Web**: idToken 검증용. 발급된 `Client ID` 를 다음 두 곳에 동일하게 입력.
     - 모바일 `.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
     - 서버 `.env`: `GOOGLE_ALLOWED_AUDIENCES` (쉼표 구분, 단일 값 가능)

## 5) Release 빌드 사전 등록

릴리즈 직전 한 번 빌드를 수행해 release SHA-1 을 확보하고, 위 3 콘솔에 모두 추가한다.

```powershell
cd apps/mobile
npx eas-cli build --profile production --platform android
# 완료 후 credentials 메뉴에서 release SHA-1 확인 → 3개 콘솔에 추가
```

> **주의**: release keystore 가 변경되면 SHA-1 이 바뀌어 SDK 로그인이 모두 깨진다. EAS 가 보관하는 keystore 를 분실하지 않도록 백업/팀 공유 정책을 합의한다.

## 6) 회귀 점검

콘솔 등록 후 `docs/qa/native-sns-sdk-regression.md` 시나리오를 통과해야 출시 가능.
