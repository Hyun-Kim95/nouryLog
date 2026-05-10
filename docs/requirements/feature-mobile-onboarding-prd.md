---
type: prd
project: dietManagement
status: draft
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
updated_at: 2026-05-09
tags: [requirements, prd, mobile-app, onboarding]
---

# 모바일 온보딩(APP_ONBOARD) 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 모체 PRD `feature-diet-management-app-prd.md`의 §5.1·§9를 보강하는 **모바일 온보딩 단일 화면 전용 미니 PRD**다. 화면 디자인 SSOT는 Stitch 폴리시드 화면 `fd8994c143c84e6b89d98bbad6ffad35`(키 `APP_ONBOARD`, `scripts/stitch/lib/briefs.ts` brief 참조). 디자인 스펙·상태표는 `docs/design/mobile-onboarding-spec.md`를 함께 본다.

## 1) 목적

- 회원가입 직후 사용자에게 **권장량 계산에 필요한 최소 프로필**을 입력하게 하여, 첫 진입 직후부터 의미 있는 권장 단백질·칼로리 값을 제공한다.
- 입력을 완료한 사용자는 즉시 Main 탭(홈)으로 진입한다. 입력하지 않거나 미완성 상태에서는 다음 진입에도 동일 화면을 다시 만나도록 한다(트리거 재함입 보장).

## 2) 적용 범위

- 대상: 모바일 앱 일반 사용자(`role === 'USER'`)로 로그인된 상태의 사용자.
- 제외: 관리자 콘솔, 비로그인 상태, 소셜 로그인 conflict resolve 흐름.

## 3) 사용자 흐름

1. 사용자가 회원가입(이메일/소셜) 또는 첫 로그인을 완료한다.
2. 앱이 부팅 시점에 `accessToken` + 온보딩 트리거를 평가하고, 미완료면 `Onboarding` 라우트로 진입한다.
3. 사용자는 단일 스텝 폼에 4 필드를 입력하거나 "나중에 설정"을 선택한다.
4. "다음" 클릭 시 `PUT /me/profile`로 저장 → `POST /me/recommendation/recalculate`를 자동 호출 → 토스트 노출 → Main 탭으로 이동.
5. "나중에 설정" 클릭 시 Main 탭으로 이동하되 트리거 플래그를 끄지 않는다(다음 부팅에 다시 만남).

## 4) 결정 사항 (HUMAN 합의 2026-05-09)

| 항목 | 결정 | 비고 |
|---|---|---|
| 디자인 안 | **Stitch 단일안**으로 진행 | 본 화면은 단일 스텝·작은 범위라 65-design-gate의 이중 디자인안 정책 예외. 안 B(Stitch) HTML/스크린샷이 SSOT |
| 트리거 | **SecureStore `dm_onboarding_done` 플래그** | 서버 스키마 변경 없이 클라이언트로 명시 관리. 토큰 삭제 시(`clearTokens`)에도 함께 제거하여 다른 계정 진입 시 재함입 보장 |
| 검증 범위(MVP) | age **13~99**, heightCm **100~250**, weightKg **20~300** | API 계약 v1.2에 명시. frontend·backend 동시 적용 |
| 건너뛰기 | **허용** | "나중에 설정" 텍스트 버튼. 트리거 재함입은 유지 |
| 자동 권장 계산 | **저장 직후 자동 호출** | `POST /me/recommendation/recalculate` 결과는 SecureStore에 캐시하지 않고 Main이 자체 fetch |

## 5) 화면 / 입력 필드

본 절은 모체 PRD §9.1의 일부를 인용·구체화한다. 시각 디테일은 `docs/design/mobile-onboarding-spec.md`.

### 필드 (4개)

| 필드 | 타입 | 단위 | 검증(MVP) | 기본값(미입력 표시) | API 매핑 |
|---|---|---|---|---|---|
| 성별 | 세그먼트(남/여/응답하지 않음) | — | 필수, 3개 중 택 1 | 없음(미선택) | `gender ∈ {male, female, unspecified}` |
| 나이 | 숫자 input(numeric keypad) | "세" | 13~99 정수 | 없음 | `age` |
| 신장 | 숫자 input | "cm" | 100~250 정수 | 없음 | `heightCm` |
| 체중 | 숫자 input(소수 1자리 허용) | "kg" | 20~300, 소수 첫째 자리 허용(서버는 정수 저장) | 없음 | `weightKg` |

> Brief 원안의 활동량·목표 라디오는 본 PRD에서는 **포함하지 않는다**. 서버 `Profile` 스키마에 해당 필드가 없고 v1.2 범위에서도 추가하지 않는다(후속 PRD로 분리). Stitch 시안의 두 라디오 영역은 디자인 스펙에서 제외 표기한다.

### 액션

- Primary: "다음" — 모든 필드 유효 시 활성. 비활성 시 클릭하면 첫 오류 필드로 포커스 + 인라인 메시지 노출.
- Secondary(텍스트 버튼): "나중에 설정" — 즉시 Main 이동(트리거 미해제).

### 카피

- 제목: "기본 정보를 알려주세요"
- 보조: "정확한 칼로리·영양 권장량 계산을 위해 입력해 주세요. 언제든 설정에서 변경할 수 있습니다."
- 동의 안내(1줄): "프로필 정보는 권장량 계산에만 사용됩니다."
- 자동 권장 계산 토스트(저장 성공 시): "프로필을 저장했어요. 권장량을 다시 계산했습니다."

## 6) 상태 처리(5상태) / 에러 매핑

| 상태 | 트리거 | 표현 |
|---|---|---|
| 기본 | 진입 직후 | 폼 활성, "다음" 비활성(필드 유효성 미충족) |
| 로딩(저장 중) | "다음" 클릭 후 PUT 진행 | 모든 입력 비활성 + Primary 버튼 스피너 + "저장하고 있어요" 보조 텍스트 |
| 검증 오류(클라이언트) | onChange/onBlur, "다음" | 필드 인라인 빨간 메시지(예: "나이는 13세 이상 99세 이하이어야 합니다.") |
| 검증 오류(서버 422) | PUT 응답 `code: VALIDATION_FAILED`, `details.field`로 필드 매핑 | 해당 필드 인라인 + 상단 보조 배너(서버 메시지 그대로) |
| 통신 오류(401/403/5xx) | 401/403→ 토큰 만료 처리 후 Login 복귀, 5xx→ 상단 빨간 배너 + "다시 시도" | Login 복귀 시 `clearTokens` + 안내 토스트 |
| 완료 | PUT 200 + recalc 200 | 토스트 + Main(Home) 이동, `dm_onboarding_done = "1"` 저장 |
| 권한 제한 | 본 화면 N/A | — |

서버 검증 메시지 코드 표준: `code = VALIDATION_FAILED`, `details = { field: 'age' | 'heightCm' | 'weightKg' | 'gender', allowedMin?, allowedMax? }`. (m5 backend 트랙에서 보강.)

## 7) 트리거 / 라우팅

- 부팅 흐름:
  1. `getAccessToken()` → 토큰 없으면 Login으로.
  2. 토큰 있으면 `getOnboardingDone()` 호출. `"1"` 이면 Main, 그 외에는 `Onboarding` 라우트.
- 화면 종료 흐름:
  - 저장 완료 → `setOnboardingDone("1")` 후 Main `reset` 네비게이션.
  - "나중에 설정" → 플래그 미설정. Main으로 이동(다음 부팅 재함입).
- 토큰 만료/로그아웃: `clearTokens` 호출 시 `dm_onboarding_done` 도 함께 제거(다른 계정 보호).

## 8) API 계약(영향 범위)

기존 v1.1 그대로 + **v1.2 보강**(API 계약 SSOT는 `docs/requirements/feature-diet-management-api-contract-v1.md`).

| 엔드포인트 | 변경 | 비고 |
|---|---|---|
| `GET /me/profile` | 변경 없음 | 본 화면에서는 사용 불필요(트리거는 SecureStore 플래그) |
| `PUT /me/profile` | **검증 강화 v1.2** | 422 응답 시 `details.field` 표준화. 본문 길이/타입 외 범위(`age 13~99`, `heightCm 100~250`, `weightKg 20~300`) 강제 |
| `POST /me/recommendation/recalculate` | 변경 없음 | 저장 직후 자동 호출 |

## 9) 다크모드 / 디자인 토큰 정책

- 모바일 다크모드는 본 화면을 시작점으로 도입한다.
- `apps/mobile/src/themeTokens.ts`에 라이트/다크 두 팔레트를 분리하고, `useColorScheme()`(시스템 추종) 기본 + 추후 사용자 토글을 추가할 수 있게 둔다.
- 본 PRD는 시스템 추종만 채택하고, 사용자 토글은 후속 PRD.
- 토큰 키 일관화(admin-web의 ds-* 컬러 시스템 톤과 정합):
  - `bg`, `surface`, `surface-2`, `fg`, `fg-muted`, `fg-subtle`, `border`, `primary`, `primary-fg`, `danger`, `warn`, `info`, `success`.

## 10) 비범위 / 후속 PRD

- 활동량·목표(라디오 4종/3종) 입력 — 별도 후속 PRD에서 다룬다.
- 사용자 다크모드 토글 UI.
- 신장/체중 단위 변경(cm↔ft, kg↔lb).
- 회원가입 → 이메일 인증 단계.
- 비밀번호 재설정.

## 11) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. HUMAN 합의 5항목 반영. m1.
