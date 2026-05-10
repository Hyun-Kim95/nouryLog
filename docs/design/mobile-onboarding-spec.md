---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-mobile-onboarding-prd.md
updated_at: 2026-05-09
tags: [design, mobile, onboarding, stitch]
---

# 모바일 온보딩(APP_ONBOARD) 디자인 스펙 v0.1 (draft)

## 0) 출처

- 안 B(SSOT): Stitch 폴리시드 화면 `fd8994c143c84e6b89d98bbad6ffad35` (키 `APP_ONBOARD`, 디바이스 MOBILE 390x844 기준).
- 원본 brief: `scripts/stitch/lib/briefs.ts`의 `APP_ONBOARD` 항목.
- 안 A(로컬 목업): **본 화면에 한해 단일 스텝·작은 범위 예외**로 65-design-gate 이중 안 정책에서 제외(미니 PRD §4 결정 기록).
- 결정 사유: 단일 스텝 화면, 변동성 낮음, 기존 admin 트랙에서 이미 이중 안 비교를 한 차례 진행했으며 본 화면은 디자인 자체보다 정책·검증 정확도가 더 큼.

## 1) 화면 구조 (모바일, 1 컬럼, safe-area 적용)

```
┌──────────────────────────────────────┐
│  ←  (header bar 56dp, 좌측만)         │
│                                      │
│  H1  기본 정보를 알려주세요              │
│  P   정확한 칼로리·영양 권장량…         │
│                                      │
│  [Field] 성별                         │
│  ┌────────┬────────┬─────────────┐   │
│  │  남성  │  여성   │ 응답하지 않음 │   │  segmented control
│  └────────┴────────┴─────────────┘   │
│  helper                              │
│                                      │
│  [Field] 나이                         │
│  ┌────────────────────────────┐ "세"  │  numeric input
│  └────────────────────────────┘      │
│  helper / inline error               │
│                                      │
│  [Field] 신장(cm)                     │
│  [Field] 체중(kg)                     │
│                                      │
│  P   프로필 정보는 권장량 계산에만…      │  consent footer 1 line
│                                      │
├──────────────────────────────────────┤  sticky bottom (safe-area)
│  [ 다음           ]  primary, full   │
│  나중에 설정          (text button)   │
└──────────────────────────────────────┘
```

- 헤더는 좌측 닫기/뒤로 아이콘만 노출(첫 진입에서는 hidden 또는 무시 가능).
- "다음"은 sticky 하단, 키보드 노출 시 키보드 위로 띄움(`KeyboardAvoidingView`).
- "나중에 설정"은 "다음" 바로 아래의 텍스트 버튼으로 함께 노출.
- 활동량/목표 라디오는 **본 화면에서 비활성**(미니 PRD §10 비범위).

## 2) 필드 사양

| 필드 | 컴포넌트 | 입력 모드 | 검증 메시지(클라이언트) | 입력 보조 |
|---|---|---|---|---|
| 성별 | Segmented (3) | tap | "성별을 선택해 주세요." | 라벨: 남성/여성/응답하지 않음 |
| 나이 | TextInput | `numeric` | "나이는 13세 이상 99세 이하이어야 합니다." | suffix "세", 최대 2자 |
| 신장 | TextInput | `numeric` | "신장은 100~250cm 범위로 입력해 주세요." | suffix "cm", 최대 3자 |
| 체중 | TextInput | `decimal-pad` | "체중은 20~300kg 범위로 입력해 주세요." | suffix "kg", 소수 1자리 허용 |

서버 422 응답이 오면 `details.field`를 키로 동일 위치에 인라인 노출(미니 PRD §6).

## 3) 상태 (5상태)

| 상태 | 표현 |
|---|---|
| 기본 | 모든 입력 활성. "다음" 비활성(필수 4 필드 유효성 미충족). |
| 로딩(저장 중) | 입력 비활성, "다음" 자리에 spinner + "저장하고 있어요" 보조 텍스트, "나중에 설정" 비활성. |
| 검증 오류 | 해당 필드 보더 `--c-danger`, helper 텍스트 `--c-danger`, 첫 오류 필드 자동 focus. |
| 통신 오류(5xx) | 화면 상단(헤더 아래) 배너 노출: "프로필을 저장하지 못했어요. 다시 시도해 주세요." + 우측 [다시 시도]. |
| 완료 | 토스트 1.5s + Main `reset` 네비게이션. SecureStore 플래그 set. |
| 권한 제한 | 해당 없음(로그인 사용자 전용). |

> 401/403은 별도 처리: `clearTokens` 후 Login으로 reset.

## 4) 반응형 / 안전 영역

- 기준: 390 x 844 (iPhone 13 mini~14). 320~430 폭에서 padding 16dp 유지, 폼 카드 max-width 480dp(태블릿/에뮬레이터에서 가운데 정렬).
- 키보드: `KeyboardAvoidingView` (iOS: `padding`, Android: `height`). sticky 하단 버튼은 키보드 상단으로 끌어올림.
- 가로 회전: 본 화면은 세로 고정(앱 전역 설정과 무관하게 화면 단위로 잠금 — 후속에서 결정 가능, 1차에서는 시스템 추종).
- 안전 영역: `SafeAreaView`로 상하 패딩 자동, 하단 sticky는 `useSafeAreaInsets` 보정.

## 5) 다크모드 / 토큰

`apps/mobile/src/themeTokens.ts`에 두 팔레트 병기. admin-web `tokens.css`의 `--ds-*` 명명과 톤 정합(슬레이트/그린).

라이트:

| key | hex |
|---|---|
| bg | #ffffff |
| surface | #ffffff |
| surface-2 | #f8fafc |
| fg | #0f172a |
| fg-muted | #475569 |
| fg-subtle | #94a3b8 |
| border | #e2e8f0 |
| primary | #16a34a |
| primary-fg | #ffffff |
| danger | #b91c1c |
| warn | #b45309 |
| info | #1d4ed8 |
| success | #15803d |

다크:

| key | hex |
|---|---|
| bg | #0b1220 |
| surface | #111827 |
| surface-2 | #1f2937 |
| fg | #f8fafc |
| fg-muted | #cbd5e1 |
| fg-subtle | #94a3b8 |
| border | #334155 |
| primary | #22c55e |
| primary-fg | #052e16 |
| danger | #fca5a5 |
| warn | #fcd34d |
| info | #93c5fd |
| success | #86efac |

WCAG AA: 본 팔레트에서 `fg / bg`, `fg-muted / bg`, `primary / primary-fg`, `danger / surface` 모두 4.5:1 이상이 되도록 기준값을 조정. 구현 시 RN의 `accessibilityLabel`/`accessibilityHint` 함께 부여.

전환 정책: 1차는 `useColorScheme()`(시스템 추종)만. 사용자 토글은 후속 PRD.

## 6) 인터랙션 / 모션

- 세그먼트 선택 시 200ms 색상 트랜지션(`Pressable` + `Animated.timing`).
- "다음" 활성 → 비활성 변경은 즉시(트랜지션 없음). 로딩 진입은 "다음" 라벨이 spinner로 cross-fade(150ms).
- 토스트는 3-line 한도, 하단 80dp에서 위로 fade-in 200ms / fade-out 200ms.

## 7) 접근성

- `accessibilityRole="button"` 적용: 세그먼트, "다음", "나중에 설정", 토스트 close.
- 라벨: 한국어 명시(예: `accessibilityLabel="나이, 만 단위 숫자"`).
- 키보드 dismiss: 폼 외부 영역 탭 시 dismiss(`Pressable` overlay).
- 폰트 스케일: OS 시스템 폰트 스케일 추종(고정 크기 사용 금지, RN `PixelRatio.getFontScale()` 호환).

## 8) 구현 노트(F 트랙용)

- 컴포넌트 분할:
  - `OnboardingScreen.tsx`(스크린): 상태/네비게이션/저장.
  - `OnboardingForm.tsx`(폼 핸들·검증): 4 필드 + onChange/onBlur/onSubmit.
  - `Field.tsx`(공통 텍스트 필드 컴포넌트, suffix·error helper 포함).
  - `Segmented.tsx`(공통 세그먼트 컴포넌트).
- 검증 함수: `validateAge`, `validateHeightCm`, `validateWeightKg`, `validateGender` — 미니 PRD §5 범위와 일치.
- 저장 함수: `saveProfile(values)` → `PUT /me/profile`, 성공 시 `recalc()` → `POST /me/recommendation/recalculate`. 두 번째 호출 실패는 토스트 경고만 띄우고 Main으로 이동(데이터는 추후 Main에서 재계산 가능).
- SecureStore 키: `dm_onboarding_done = "1"` 저장. `clearTokens()`에서 함께 제거.
- 라우팅: `RootStack`에 `Onboarding` 추가, `RootNavigator`의 `initialRouteName` 결정 로직을 `App.tsx`에서 한 번에 수행.

## 9) 수동 시각 점검 체크리스트(m6 검증용)

> dev 빌드(시뮬레이터/실기기)에서는 화면 우상단의 **DEV** 버튼으로 `DevPanel`을 열 수 있다(prod 빌드에는 노출되지 않음, `apps/mobile/src/dev/DevPanel.tsx`). 아래 항목 중 ⚙️ 표시는 DevPanel을 사용해 빠르게 재현 가능하다.

- [ ] iPhone(390x844) 시뮬레이터: ⚙️ 테마 강제(라이트/다크) 토글 시 색·대비 정합.
- [ ] Android Pixel 5: sticky 버튼이 키보드 위로 올라옴.
- [ ] 검증 오류 5케이스: age 12·100, height 99·251, weight 19.9·300.1, gender 미선택, 모두 미입력. (서버 메시지 + `details.field`로 인라인 표시)
- [ ] 서버 422 시뮬레이션: 위 케이스를 그대로 입력하면 backend가 422 응답 + `details.field`를 반환 → 인라인 + 상단 배너.
- [ ] ⚙️ 5xx 시뮬레이션: DevPanel "saveProfile 5xx 강제" 토글 후 "다음" 클릭 → 상단 빨간 배너 표시(서버 종료 없이 재현).
- [ ] ⚙️ 로그아웃 → 다른 계정 로그인 → Onboarding 재함입: DevPanel "강제 로그아웃" 후 다른 계정으로 로그인.
- [ ] ⚙️ "나중에 설정" → Main 이동 → DevPanel "온보딩 재진입"으로 즉시 Onboarding 라우트로 reset (앱 재시작 대용).
- [ ] ⚙️ 저장 완료 + recalc 실패: DevPanel "recalcRecommendation 실패 강제" 토글 후 "다음" → 토스트 경고("권장량 계산은 잠시 후…") 1회 + Main 진입.

### DevPanel 사용법
- 위치: 모든 dev 화면 우상단의 **DEV** 핀형 버튼.
- 섹션:
  - **테마 강제**: `system` / `light` / `dark` 라디오. 선택 즉시 `theme.tsx`의 `useColorScheme()` 결과를 override.
  - **API 시뮬레이션**: `saveProfile 5xx 강제`, `recalcRecommendation 실패 강제` 토글. 실제 서버 호출 직전에 `ProfileApiError(500, code: FORCED_5XX)`로 던져진다(`api/profile.ts` `maybeForceFail`).
  - **흐름 트리거**: `온보딩 재진입`(SecureStore 플래그 제거 + Onboarding으로 reset), `강제 로그아웃`(토큰·플래그 제거 + Login으로 reset).
- 운영 빌드 보호: `DevPanel` 컴포넌트는 `isDevBuild()`(`__DEV__`)가 false일 때 `null`을 반환한다. `maybeForceFail` 또한 동일 가드를 거쳐 prod에서는 분기 자체가 비활성화된다.

## 10) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. brief + 미니 PRD 결정 5항목 통합. m2.
- 2026-05-09 (v0.1.1): §9 체크리스트에 DevPanel(`apps/mobile/src/dev/DevPanel.tsx`) 사용법 추가. 라이트/다크 강제, 5xx/recalc 실패 시뮬, 온보딩 재진입, 강제 로그아웃을 dev 빌드 한정으로 제공.
