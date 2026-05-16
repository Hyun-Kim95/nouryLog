# 네이티브 SNS SDK 전환 회귀 시나리오

## 전제 조건
- EAS Development Build APK 가 테스트 폰에 설치되어 있어야 한다 (Expo Go 에서는 동작하지 않는다).
- `apps/mobile/.env` 에 아래 값이 채워져 있어야 한다.
  - `EXPO_PUBLIC_NAVER_CLIENT_ID`, `EXPO_PUBLIC_NAVER_CLIENT_SECRET`, `EXPO_PUBLIC_NAVER_IOS_URL_SCHEME`
  - `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- 서버에 `GOOGLE_ALLOWED_AUDIENCES` 가 위 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 와 동일하게 등록되어야 한다 (운영).
- 각 콘솔(네이버/카카오/GCP) 의 Android 등록에 **debug SHA-1** 이 들어가 있어야 한다.

## 시나리오 매트릭스 (provider × 흐름)

각 행에 대해 ✅/❌ 표시. 실패한 행은 로그(metro / Railway)와 함께 메모 남긴다.

| Provider | 신규 가입 | 기존 사용자 로그인 | 이메일 충돌 (link) | 이메일 충돌 (separate) | 약관 동의 흐름 |
|----------|----------|---------------------|--------------------|--------------------------|----------------|
| Naver    |          |                     |                    |                          |                |
| Kakao    |          |                     |                    |                          |                |
| Google   |          |                     |                    |                          |                |

## 시나리오 상세

### 1. 신규 가입
1. SDK 가 미가입 계정으로 로그인.
2. 서버 `/exchange` 응답이 `result=success, requiresConsent=true`.
3. 클라이언트가 약관 동의 화면으로 이동.
4. 동의 후 `/me/consents` 호출 → 온보딩 또는 메인으로 진입.

### 2. 기존 사용자 로그인
1. 같은 SNS 계정으로 다시 로그인.
2. `/exchange` 응답이 `result=success, requiresConsent=false`.
3. 토스트 "SNS로 로그인했어요." 후 메인 진입.

### 3. 이메일 충돌 (link)
1. SNS 가 알려준 이메일과 동일한 이메일로 가입한 계정이 이미 있을 때 SDK 로그인 시도.
2. `/exchange` 응답이 `result=conflict, conflictToken, email`.
3. 화면에 충돌 안내 + "기존 계정과 연결" / "새 계정으로 가입" 버튼이 노출.
4. "기존 계정과 연결" 선택 → `/auth/social/conflict/resolve` (action=link) → 메인 진입.

### 4. 이메일 충돌 (separate)
1. 위 3번과 동일한 충돌 상황.
2. "새 계정으로 가입" 선택 → `/auth/social/conflict/resolve` (action=separate) → 신규 사용자 생성 → 메인 진입.

### 5. 사용자 취소
1. SDK 화면에서 사용자가 취소.
2. 토스트 "SNS 로그인이 취소되었습니다." (info 색상) + 화면에 머무름.
3. Metro 로그에 `console.warn('[social-sdk]', ...)` 가 남지 않는다 (취소는 경고 대상 아님).

### 6. 로그아웃 후 재로그인
1. 메인의 로그아웃 → 다시 SNS 버튼.
2. 정상적으로 1~2번 흐름이 재현되어야 한다 (SDK 캐시 영향 없음).

## 점검 포인트
- **취소 식별**: 각 어댑터의 `cancelled` 분기가 동작해 에러 토스트 대신 info 토스트가 떠야 한다.
- **로그 가독성**: 토큰 값은 절대 로그에 노출하지 않는다 (`providerAccessToken`, `idToken` 도 마찬가지).
- **다크모드**: 충돌 UI 와 약관 화면이 다크모드에서도 깨지지 않는지 확인.
- **반응형**: 작은 화면(Android 5인치급)에서 버튼이 잘리지 않는지 확인.
