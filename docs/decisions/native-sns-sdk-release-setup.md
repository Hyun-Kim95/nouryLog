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

## 5.1) Play Console(내부·비공개·프로덕션)으로 설치한 경우 — **필수**

Play Store 트랙에서 받은 APK/AAB 는 **Google Play 앱 서명** 인증서로 다시 서명된다.  
EAS `credentials` 의 upload/release SHA-1 만 등록해 두면 **스토어 설치 빌드에서 네이버·카카오·구글 SDK 로그인이 전부 실패**할 수 있다.

1. [Play Console](https://play.google.com/console) → **nouryLog 앱을 연 상태**(계정 설정이 아님).
2. SHA-1 확인 경로 (**하나만** 성공하면 됨):
   - **A) 직접 URL (가장 빠름):** [Play 앱 서명 / 키 관리](https://play.google.com/console/developers/app/keymanagement) — 앱 선택 후 열림.
   - **B) Google Play로 보호됨:** 왼쪽 메뉴 **Google Play로 보호됨** 클릭 → **페이지 본문을 아래로 스크롤** → 접을 수 있는 섹션 **「Play 스토어 보호」**(※ *Play 스토어 배포* 가 아님) 펼치기 → **Play 앱 서명** 관련 **설정** / **관리** 링크.
   - **C) 구 UI:** **테스트 및 출시** → **설정** → **앱 서명** (또는 **앱 무결성** → Play 앱 서명 → 설정).
3. 상단 **검색**에 `앱 서명` 또는 `keymanagement` 입력.
4. **앱 서명 키** 섹션의 **SHA-1** (및 필요 시 SHA-256) 복사.  
   ⚠️ **업로드 키** SHA-1 이 아니라 **앱 서명 키** 지문을 SNS 콘솔에 등록한다.
3. 아래에 **기존 EAS SHA-1 과 함께 추가** (덮어쓰기가 아니라 항목 추가).
   - 네이버: Android 환경 SHA-1
   - 카카오: Android 키 해시 — Play SHA-1 을 **Base64** 로 변환해 등록 ([§4.2](#42-카카오-디벨로퍼스) 참고)
   - GCP: OAuth 클라이언트 **Android** — 패키지 `com.nourylog.app` + Play SHA-1

**검증 구분**

| 설치 경로 | 서명에 쓰이는 SHA-1 |
|-----------|---------------------|
| EAS APK 를 PC/링크로 직접 설치 | EAS keystore (development / upload) |
| Play 내부·비공개·오픈·프로덕션 트랙 | **Play 앱 서명 키** |

내부 테스트에서만 SNS 가 깨지고, 같은 기기에 EAS APK 는 되면 거의 이 케이스다.

## 5.2) EAS `preview` Gradle 실패 (`No variants exist`) — 모노레포

증상: `eas build --profile preview` 가 Run gradlew 에서 `No matching variant` / `No variants exist` 로 실패.

조치(레포 반영):

- 루트 `package.json` `overrides` 로 `react` / `react-dom` **19.1.0** 통일 (모바일 RN 0.81 과 admin-web 공통).
- `apps/mobile/plugins/withKakaoMavenRepository.js` + `app.config.ts` 플러그인 등록(카카오 Maven).
- 루트 `.easignore` 로 `image/` 등 대용량 제외.

**주의:** 로컬 `apps/mobile/android` 가 EAS tarball 에 포함되면 로그에 `Skipped running expo prebuild because the android directory already exists` 가 뜨고, 이번과 같은 `No variants exist` 가 난다. `apps/mobile/.easignore` 에 `/android` 가 있어야 하며, 의심되면 로컬에서 `android` 폴더를 삭제한 뒤 빌드한다.

재빌드:

```powershell
cd apps/mobile
npx eas-cli build --profile preview --platform android --clear-cache
```

**EAS `preview` 환경 변수:** `EXPO_PUBLIC_API_URL`(프로덕션 API HTTPS)을 preview 에도 등록하지 않으면 앱 실행 후 API 호출이 실패할 수 있다(Gradle 과 별개).

## 6) 회귀 점검

콘솔 등록 후 `docs/qa/native-sns-sdk-regression.md` 시나리오를 통과해야 출시 가능.
