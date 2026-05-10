---
type: prd
project: dietManagement
status: draft
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/design/mobile-toast-spec.md
  - docs/requirements/feature-mobile-onboarding-prd.md
  - docs/requirements/feature-mobile-profile-extra-prd.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [requirements, prd, mobile-app, toast, ux]
---

# 모바일 토스트 시스템 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 직전 두 트랙(`feature-mobile-onboarding-prd.md`, `feature-mobile-profile-extra-prd.md`)에서 "토스트 + Main 이동" / "토스트 + navigation.goBack()"으로 명세돼 있었으나 실제 구현은 인라인 텍스트로만 가능했던 갭을 닫는다. 화면 디자인 SSOT는 `docs/design/mobile-toast-spec.md`.

## 1) 목적

- 사용자에게 **저장 결과(성공/실패)·경고**를 화면 전환과 무관하게 즉시 알리는 공통 표시 수단을 제공한다.
- `ProfileEditScreen` 저장 성공 토스트가 `navigation.goBack()` 후 사라지는 한계(컴포넌트 언마운트 시 인라인 텍스트 소실)를 해결한다.
- 인라인 배너/Pressable 메시지로 분산된 결과 메시지 패턴을 **단일 ToastProvider**로 통합하여 관리·확장을 단순화한다.

## 2) 적용 범위

- 대상: 모바일 앱(`apps/mobile`).
- 포함:
  1. `src/toast/` 신규 모듈(ToastProvider, useToast 훅, Toast 시각 컴포넌트).
  2. `OnboardingScreen` 3 사용처: 저장 성공·저장 실패·recalc 실패 경고.
  3. `ProfileEditScreen` 2 사용처: 저장 성공(goBack 직전)·저장 실패.
- 제외:
  - admin-web 토스트(별도 트랙 3에서 동일 정책 + 표준 위치/큐잉으로 도입).
  - `LoginScreen`, `MainTabs` 등 기존 화면의 인라인 메시지 일괄 교체(점진적 후속).
  - 액션 버튼이 포함된 토스트(예: "되돌리기"). MVP에서는 단순 메시지만.
  - 토스트 누적·이력 화면.
  - 알림(푸시) 시스템.

## 3) 사용자 흐름

### 3.1 OnboardingScreen
1. 사용자가 4 필드 + 활동량/목표 라디오를 입력하고 "다음" 탭.
2. `saveProfile` 성공 → `success` 토스트 "프로필을 저장했어요." 노출 → 자동 recalc → Main reset.
3. `saveProfile` 실패 → `error` 토스트 "저장에 실패했어요. 다시 시도해주세요." (기존 상단 배너 보존, 토스트는 보조 알림).
4. recalc 실패(저장은 성공) → `info` 토스트 "권장량을 다시 계산하지 못했어요. 잠시 후 다시 시도하세요." → Main reset 그대로 진행.

### 3.2 ProfileEditScreen
1. 사용자가 폼을 수정하고 "저장" 탭.
2. `saveProfile` 성공 → `success` 토스트 발화 → 100ms 지연 후 `navigation.goBack()` (토스트는 글로벌 ToastProvider에 마운트되어 이전 화면에서도 가시).
3. `saveProfile` 실패 → `error` 토스트 + 기존 인라인 배너 유지(같은 화면 내 표기). `navigation.goBack()` 호출 안 함.

### 3.3 토스트 자체
1. 발화 → 200ms fade-in + slide-up.
2. 표시 (success/info=3.5s, error=5s).
3. 200ms fade-out.
4. 다음 토스트가 있으면 즉시 교체(이전 토스트 fade-out 완료 후).

## 4) 결정 사항 (HUMAN 합의 2026-05-09, 추천안 일괄 채택)

| ID | 항목 | 결정 |
|---|---|---|
| G1 | 라이브러리 | 자체 구현 (Context + `Animated.View`, 의존성 추가 0) |
| G2 | 표시 위치 | 화면 하단 safe-area 위 (`bottom = insets.bottom + spacing.xl`) |
| G3 | 표시 시간 | `success`/`info` = 3.5s, `error` = 5s (오류는 더 길게) |
| G4 | 종류 | `success` / `error` / `info` 3종 (`warning`은 후속) |
| G5 | 액션 버튼 | 미지원 (MVP 단순화) |
| G6 | 큐잉 | 단일 표시(교체) — 새 토스트가 이전을 즉시 fade로 교체 |
| G7 | 우선 도입처 | 5사용처: Onboarding 3 + ProfileEdit 2 (위 §3) |

## 5) API / 백엔드 영향

- 영향 없음. 클라이언트 한정.

## 6) 상태 처리(5상태)

| 상태 | 표현 |
|---|---|
| 기본 | 토스트 큐 비어있음. 화면에 토스트 없음. |
| 로딩 | N/A (토스트 자체는 즉시 발화). |
| 빈 데이터 | N/A. |
| 오류 | 발화 실패는 토스트가 아닌 콘솔 warn으로만 보고(개발 빌드). |
| 완료 | 자동 dismiss 후 큐 비우기. |
| 권한 제한 | N/A (인증 무관 컴포넌트). |

## 7) 비기능 / 의존성

- 추가 외부 의존성 없음.
- `useTheme()`/`useUserThemeMode()`로 라이트/다크 토큰 자동 반영(테마 토글 트랙 v0.1 결과 활용).
- `react-native-safe-area-context`는 이미 사용 중.
- 성능: 단일 Animated.View. `useNativeDriver: true`로 메인 스레드 영향 최소화.
- 접근성: `accessibilityLiveRegion="polite"` (오류는 `assertive`).

## 8) 구현 영향(요약)

- 신규: `apps/mobile/src/toast/ToastProvider.tsx`, `apps/mobile/src/toast/useToast.ts`, `apps/mobile/src/toast/Toast.tsx`(또는 ToastProvider 안 인라인 컴포넌트).
- 변경: `apps/mobile/App.tsx`(ToastProvider 마운트), `apps/mobile/src/screens/OnboardingScreen.tsx`(3 사용처), `apps/mobile/src/screens/ProfileEditScreen.tsx`(2 사용처).
- 백엔드/계약 변경 0.

## 9) 마이그레이션

- 마이그레이션 데이터 없음.
- 기존 인라인 배너는 보존(동일 화면 내 잔류 표시 + 토스트는 추가 알림). 점진적 교체는 후속.

## 10) DoD (Gate 3)

- 5사용처에서 의도한 종류·메시지로 토스트 발화.
- 라이트/다크 두 팔레트 모두 4.5:1 대비.
- ProfileEdit 저장 성공 토스트가 goBack 후에도 가시.
- 단일 교체 큐잉이 시각적 부조화 없이 동작.
- tsc/lint 통과.

## 11) 비범위 / 후속 트랙

- admin-web 토스트 공통화(트랙 3에서 동일 정책 + 표준 위치/큐잉 도입).
- `warning` 종류 추가.
- 액션 버튼 토스트("되돌리기" 등) — 저장 후 undo 패턴과 함께 도입.
- LoginScreen·MainTabs 등 다른 화면의 인라인 메시지 일괄 교체.
- 토스트 누적·이력 화면.
- 푸시 알림과의 연동.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. HUMAN 합의 7항목(G1~G7) 일괄 채택. t2-1.
