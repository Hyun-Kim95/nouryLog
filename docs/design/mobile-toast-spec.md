---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-mobile-toast-prd.md
related:
  - docs/design/mobile-onboarding-spec.md
  - docs/design/mobile-profile-extra-spec.md
  - docs/design/mobile-theme-toggle-spec.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [design, mobile, toast, ux, dark-mode]
---

# 모바일 토스트 시스템 디자인 스펙 v0.1 (draft)

## 0) 출처 / 67-dual-design-exemption 면제 사유

본 트랙은 정식 룰 `.cursor/rules/67-dual-design-exemption.mdc`의 면제 조건 3개를 모두 충족하므로 **이중 안 A/B 작성을 면제**하고 단일 디자인 스펙으로 진행한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | "기존 화면 슬롯 추가(저장 결과 메시지)" + "기존 컴포넌트(Animated.View, SafeAreaProvider, theme.tsx 토큰) 재사용 단일 오버레이 보강". 신규 화면 도입 없음. |
| 2. 디자인 SSOT 존재 | 기존 `theme.tsx` 라이트/다크 토큰(`success`/`danger`/`info`) + 직전 트랙들(mobile-onboarding-spec, mobile-profile-extra-spec, mobile-theme-toggle-spec)의 5상태 패턴이 SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. 스코프 분류 = "단일 오버레이 보강", SSOT = `theme.tsx` 토큰 + 직전 3트랙 패턴, 재사용 컴포넌트 = `Animated.View`/`SafeAreaProvider`/`useTheme()`. |

면제 적용 후에도 다음은 그대로 명세한다(§4·§6·§7·§9·§11).
- 5상태 명세
- 라이트/다크 토큰 정합
- 시각 점검 체크리스트

## 1) 진입점 / 마운트 위치

- ToastProvider는 `App.tsx`의 `ThemeProvider` **안쪽**, `NavigationContainer` **바깥쪽**에 마운트.
- 마운트 트리: `SafeAreaProvider` → `DevTogglesProvider` → `ThemeProvider` → `ToastProvider` → `NavigationContainer` → `RootNavigator` + `DevPanel`.
- 화면 전환과 무관하게 가시 유지.

## 2) 시각 사양

### 2.1 위치

- 화면 하단 safe-area 위. `bottom = insets.bottom + spacing.xl`(=32px 패딩).
- 좌우 패딩 `spacing.lg`(=16px). 폭 = 화면폭 - 32px.

### 2.2 카드 구조

```
┌─────────────────────────────────────┐
│  [icon]  메시지 텍스트                │
└─────────────────────────────────────┘
```

- `padding=spacing.md` (12px), `borderRadius=radius.lg` (12px).
- `borderWidth=1`, 종류별 강조 보더.
- `flexDirection: row`, `gap=spacing.sm`, `alignItems: center`.
- 텍스트는 1~2줄 가정. 3줄 이상은 `numberOfLines={3}` + ellipsis.

### 2.3 종류별 토큰

| 종류 | 배경 | 보더 | 텍스트 | 아이콘 | 라이트 hex(예) | 다크 hex(예) |
|---|---|---|---|---|---|---|
| `success` | `surface` | `success` | `fg` | `success` 색 ✓ | bg `#ffffff` / border `#15803d` / text `#0f172a` | bg `#111827` / border `#86efac` / text `#f8fafc` |
| `error` | `surface` | `danger` | `fg` | `danger` 색 ✕ | border `#b91c1c` / text `#0f172a` | border `#fca5a5` / text `#f8fafc` |
| `info` | `surface` | `info` | `fg` | `info` 색 ⓘ | border `#1d4ed8` / text `#0f172a` | border `#93c5fd` / text `#f8fafc` |

> 모든 종류가 `surface` 배경 + 종류별 보더 강조. 컬러풀 배경(예: 빨강 배경 + 흰 텍스트)은 다크모드 대비 정합 어려움이 있어 회피.

### 2.4 아이콘

- React Native 빌드인 텍스트 글리프 사용(외부 아이콘 라이브러리 도입 회피):
  - `success` = "✓"
  - `error` = "✕"
  - `info` = "ⓘ"
- 글리프 색은 종류별 보더 색과 동일.

### 2.5 텍스트

- `fontSize=body`(14px), `fontWeight=500`.
- 대비: 모든 종류 모두 텍스트 vs 배경 4.5:1 이상(라이트/다크 모두).

## 3) 인터랙션 / 모션

### 3.1 발화

- `Animated.parallel([opacity 0→1, translateY +12→0])` 200ms ease-out.
- `useNativeDriver: true`.

### 3.2 dismiss

- 자동: 표시 시간 만료(success/info=3500ms, error=5000ms) 시 200ms fade-out + translateY 0→+12.
- 수동: 터치 시 즉시 dismiss(같은 200ms 모션).
- 단일 교체 큐잉: 다음 토스트가 발화될 때 현재 토스트가 즉시 fade-out → 200ms 후 새 토스트 fade-in.

### 3.3 큐 행동(단일 교체)

- 빠르게 연속 발화 시 큐는 길이 1 유지(가장 최신만). 이전 큐의 미발화 토스트는 새 토스트 발화 시 폐기(MVP 단순화).
- 발화 중 새 토스트 도착 시 → 현재 토스트 fade-out → 새 토스트 fade-in.

## 4) 5상태 매핑

| 상태 | 표현 | 토스트 종류 |
|---|---|---|
| 기본 | 토스트 없음 | — |
| 로딩 | 화면 자체의 스피너/비활성. 토스트는 발화 안 됨 | — |
| 빈 데이터 | N/A | — |
| 오류 | 인라인 배너 유지 + `error` 토스트 보조 | `error` |
| 완료 | `success` 토스트 + (필요 시) 화면 전환 | `success` |
| 권한 제한 | 인라인 배너 / 화면 전환(`Login` reset) + 필요 시 `error` 토스트 | `error` |

## 5) API (TypeScript)

```ts
export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind: ToastKind;
  message: string;
};

export type ToastApi = {
  show: (input: ToastInput) => void;
  hide: () => void;
};

// 훅
export function useToast(): ToastApi;
```

- 짧은 헬퍼:
  ```ts
  toast.success(message)  // = show({ kind: 'success', message })
  toast.error(message)
  toast.info(message)
  ```
- 본 트랙에서는 위 헬퍼는 별도 export하지 않고 `useToast().show({ kind, message })` 형태로 단일 API 노출(MVP 단순화).

## 6) 반응형 / 안전 영역

- 화면 폭 ≥ 360 가정. 최소 폭에서도 좌우 패딩 16px 유지.
- 태블릿(폭 ≥ 768): 토스트 max-width 480dp + 가운데 정렬.
- 키보드 표시 중에는 키보드 위에 자연스럽게 떠오름(safe-area `bottom` 기준이라 키보드 영향 없음). 키보드 아래로 가려야 한다면 후속 트랙에서 결정.
- 가로 회전: 세로 우선(시스템 추종, 화면 단위 잠금 없음).

## 7) 다크모드 / 토큰 정합

- `useTheme()`의 `mode` 변경 시 즉시 토큰 재계산.
- DevPanel `themeOverride`로 강제 적용 시에도 정상 동작.
- 라이트/다크 모두 4.5:1 대비를 §2.3 토큰 매트릭스로 보장.

## 8) 접근성

- 컨테이너에 `accessibilityRole="alert"`.
- `accessibilityLiveRegion`:
  - `success`/`info` → `polite`
  - `error` → `assertive`
- `accessibilityLabel = "[종류명] 알림: [메시지]"`(예: "성공 알림: 프로필을 저장했어요.").
- 터치 영역: 토스트 전체 클릭으로 dismiss. `accessibilityHint = "탭하면 알림을 닫습니다."`
- 폰트 스케일: 시스템 추종.

## 9) 사용처 매핑 (구현 노트)

### 9.1 OnboardingScreen
- 저장 성공 → `toast.show({ kind: 'success', message: '프로필을 저장했어요.' })` → recalc 호출 → Main reset.
- 저장 실패(422/네트워크/5xx) → `toast.show({ kind: 'error', message: '저장에 실패했어요. 잠시 후 다시 시도해 주세요.' })`. 기존 상단 배너 유지.
- recalc 실패 → `toast.show({ kind: 'info', message: '권장량을 다시 계산하지 못했어요. 잠시 후 다시 시도하세요.' })` → Main reset 그대로.

### 9.2 ProfileEditScreen
- 저장 성공 → `toast.show({ kind: 'success', message: '프로필을 저장했어요. 권장량을 다시 계산했습니다.' })` → 100ms 후 `navigation.goBack()` (toast 발화 → 시각적 fade-in 완료 직전 navigation 트리거).
- 저장 실패 → `toast.show({ kind: 'error', message: ... })` + 기존 인라인 배너 유지. goBack 호출 안 함.

> ProfileEditScreen 저장 성공 후 100ms 지연은 사용자 인지 가능성 확보용. 즉시 goBack 시 토스트 발화 모션이 끊기는 인상 회피.

### 9.3 발화 직후 화면 전환

- ToastProvider는 `NavigationContainer` 바깥에 마운트되어 화면 전환에 영향 없음.
- 화면 전환 후 자동 dismiss 타이머는 그대로 진행.

## 10) DevPanel 관계

- 본 트랙은 DevPanel 코드 변경 없음.
- DevPanel `force5xx`/`forceRecalcFail` 토글 시 토스트 발화를 시각 점검 도구로 활용(별도 변경 없이 자연스럽게 검증).

## 11) 시각 점검 체크리스트(t2-5 검증용)

- [ ] OnboardingScreen 저장 성공 → success 토스트 노출 후 Main 진입.
- [ ] OnboardingScreen DevPanel `force5xx`=on → error 토스트 + 상단 배너 둘 다 노출.
- [ ] OnboardingScreen DevPanel `forceRecalcFail`=on → info 토스트 후 Main 진입.
- [ ] ProfileEditScreen 저장 성공 → success 토스트 발화 → 약 100ms 후 goBack → Subscription 탭에서도 토스트 마저 보임.
- [ ] ProfileEditScreen DevPanel `force5xx`=on → error 토스트 + 인라인 배너 둘 다 노출, goBack 안 됨.
- [ ] 라이트/다크 두 팔레트에서 3 종류 토스트 모두 4.5:1 대비.
- [ ] DevPanel `themeOverride='light'/'dark'` 강제 시 토스트 색도 즉시 정합.
- [ ] 빠르게 연속 발화 시 새 토스트가 이전을 교체(둘 동시 노출 없음).
- [ ] 토스트 터치 → 즉시 dismiss.
- [ ] VoiceOver/TalkBack: success는 polite, error는 assertive 어나운싱.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. PRD v0.1 G1~G7 반영. t2-2.
