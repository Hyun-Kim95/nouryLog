---
type: prd
project: dietManagement
status: draft
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/design/mobile-theme-toggle-spec.md
  - .cursor/rules/40-dark-mode.mdc
updated_at: 2026-05-09
tags: [requirements, prd, mobile-app, theme, dark-mode, accessibility]
---

# 모바일 테마 사용자 토글 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 모체 PRD `feature-diet-management-app-prd.md` §9(비기능)와 룰 `.cursor/rules/40-dark-mode.mdc`의 "사용자에게 라이트/다크 모드를 전환할 수 있는 명시적 제어 + 영속 저장 전략" 항목을 모바일 앱(`apps/mobile`)에 적용하기 위한 미니 PRD다. admin-web은 이미 자체 토글·저장이 적용되어 있어 본 트랙의 범위에서 제외한다.

화면 디자인 SSOT는 본 PRD와 짝을 이루는 디자인 스펙 `docs/design/mobile-theme-toggle-spec.md`.

## 1) 목적

- 모바일 앱 사용자가 테마(라이트/다크)를 직접 선택할 수 있도록 한다.
- 선택 결과는 SecureStore에 영속 저장되어 앱 재실행·재방문 시에도 유지된다.
- 사용자가 한 번이라도 명시 선택한 후에는 OS 테마 변경에 좌우되지 않고 사용자 선택을 우선한다(예측 가능성).
- DevPanel `themeOverride`(dev 한정)와 우선순위가 충돌하지 않도록 명시한다.

## 2) 적용 범위

- 대상: 모바일 앱(`apps/mobile`) 모든 빌드(dev/prod). 사용자 권한 무관(로그인 전·후 모두 사용 가능).
- 포함:
  1. Subscription 탭의 "테마 설정" 카드(진입점 단일).
  2. SecureStore 키 `dm_theme_mode` 신규(영속 저장).
  3. `ThemeProvider` 우선순위 정리(DevPanel > 사용자 영속 모드 > 부팅 1회 시스템 추종).
  4. `ThemeToggle` 공통 컴포넌트(Segmented 재사용, light/dark 2종).
- 제외:
  - 시스템 추종 모드 노출(D1 결정에 따라 사용자 UI에서 system 옵션 미노출).
  - admin-web 테마 정책 변경(이미 충족).
  - 별도 Settings 탭 신설(Subscription 탭 카드 단일 진입, 후속 트랙에서 결정).
  - Onboarding/Login 화면 헤더의 빠른 토글(후속 트랙).
  - 토스트·트랜지션 애니메이션 강화(테마 적용 자체는 즉시 반영, 전환 모션은 비범위).
  - 사용자별 서버 동기화(로컬 디바이스 한정).

## 3) 사용자 흐름

### 3.1 첫 부팅 (저장값 없음)

1. 앱 부팅 → ThemeProvider가 SecureStore `dm_theme_mode`를 비동기로 읽음 → 값 없음.
2. `useColorScheme()`로 OS 색상 모드를 1회 확인하여 `'light'` 또는 `'dark'`로 결정.
3. 결정값을 즉시 SecureStore에 저장(이후 부팅부터는 저장값 사용).
4. ThemeProvider가 결정값을 적용한 children을 렌더.

> 로드 전 1프레임 깜빡임 방지: ThemeProvider는 사용자 모드가 결정되기 전(`mode === null`)에는 children을 렌더하지 않는다(App.tsx의 기존 `initialRoute` 미결정 패턴과 동일).

### 3.2 정상 사용 (저장값 있음)

1. 앱 부팅 → SecureStore에서 모드 로드 → 즉시 적용.
2. Subscription 탭 → "테마 설정" 카드 → 라이트/다크 Segmented 중 하나 탭.
3. 즉시 ThemeProvider 재계산 → 화면 전체 즉시 전환 + SecureStore 저장.
4. OS에서 다크/라이트가 바뀌어도 앱은 사용자 선택을 유지(무반응).

### 3.3 DevPanel 우선순위 (dev 빌드 한정)

1. DevPanel `themeOverride === 'system'`(기본값) → 사용자 모드 적용.
2. DevPanel `themeOverride === 'light'` 또는 `'dark'` → 사용자 모드 무시하고 강제 적용. SecureStore 값은 변경하지 않는다.
3. prod 빌드에서는 DevPanel이 마운트되지 않아 자연스럽게 무관.

## 4) 결정 사항 (HUMAN 합의 2026-05-09)

| ID | 항목 | 결정 |
|---|---|---|
| T1 | 토글 위치 | Subscription 탭의 "테마 설정" 카드 (별도 Settings 탭 신설은 후속) |
| T2 | UI 옵션 | `light` / `dark` 2개 (사용자 UI에는 system 옵션 미노출) |
| T3 | 저장소 | SecureStore, 키 `dm_theme_mode` (값: `'light'` / `'dark'`) |
| T4 | 시스템 추종 | 첫 부팅(저장값 없음) 한정으로 `useColorScheme()`로 초기값 결정 후 즉시 저장. 이후 OS 변경은 무시. |
| T5 | 우선순위 | DevPanel `themeOverride !== 'system'` > 사용자 영속 모드 > (저장값 없을 때) 부팅 1회 시스템 추종 |

## 5) 화면 / 입력

### 5.1 카드 구조

- 진입점: Subscription 탭의 기존 "내 프로필" 카드와 "구독 · 복구" 섹션 사이에 1개 카드 삽입.
- 카드 구성:
  - 헤더 라벨(caption): "테마"
  - 본문 1줄(body): "라이트와 다크 모드를 직접 선택할 수 있어요. 변경 즉시 반영되고 다음 실행에도 유지됩니다."
  - Segmented 2분할: `[ 라이트 | 다크 ]`
- 추가 보조 텍스트는 두지 않는다(필요 시 디자인 스펙 §3 참고).

### 5.2 검증

- 클라이언트 단독 동작이라 서버 검증 없음.
- SecureStore 저장 실패 시: 콘솔 warn + 메모리 상태로만 적용(현재 세션 내 동작), 다음 부팅에 자동 재초기화. 토스트는 표시하지 않는다(후속 토스트 시스템 도입 시 재검토).

### 5.3 카피

- 카드 헤더: "테마"
- 카드 본문: "라이트와 다크 모드를 직접 선택할 수 있어요. 변경 즉시 반영되고 다음 실행에도 유지됩니다."
- Segmented 라벨: `라이트` / `다크`
- accessibilityLabel: `라이트 모드` / `다크 모드`

## 6) 상태 처리(5상태)

| 상태 | 표현 |
|---|---|
| 기본 | 현재 모드 측이 강조(Segmented selected 토큰), 즉시 탭 가능 |
| 로딩 | 사용자 모드 결정 전 ThemeProvider children 미렌더(0프레임 깜빡임). 카드 자체는 결정 후 노출되므로 별도 로딩 없음 |
| 빈 데이터 | N/A (옵션이 항상 2개 고정) |
| 오류 | SecureStore write 실패 시 콘솔 warn만, UI는 즉시 반영 유지 |
| 완료 | 즉시 시각적 전환이 완료 신호 역할 |
| 권한 제한 | N/A (로그인 무관) |

## 7) 비기능 / 의존성

- 추가 외부 의존성 없음(`expo-secure-store`는 이미 사용 중).
- 추가 색 토큰 없음(기존 `theme.tsx` LIGHT/DARK 그대로 사용).
- 성능: SecureStore read/write는 비동기 1회, 부팅 시 ~수십ms. 화면 잔존 영향 없음.
- 접근성: Segmented 항목 `accessibilityRole="button"` + `accessibilityState={{ selected }}`. 최소 hit-area 44x44dp.

## 8) API / 백엔드 영향

- 영향 없음. 본 트랙은 클라이언트 한정. 서버 변경 0건, 계약 v1.3 그대로 유지.

## 9) DevPanel 관계 (구현 노트)

- DevPanel은 `apps/mobile/src/dev/DevPanel.tsx`에 이미 존재. `themeOverride: 'system' | 'light' | 'dark'` 3개 옵션 유지.
- `ThemeProvider`는 다음 우선순위로 최종 mode를 결정한다.

```ts
// 의사 코드
const finalMode: ThemeMode =
  themeOverride === 'light' ? 'light'
  : themeOverride === 'dark' ? 'dark'
  : userMode; // userMode 미결정 시에는 children 미렌더
```

- `userMode`는 `null | 'light' | 'dark'`. `null`이면 children 미렌더(부팅 1프레임).
- 한 번 결정된 `userMode`는 SecureStore에 저장된 값과 1:1 매핑.

## 10) 마이그레이션

- 기존 사용자: SecureStore에 `dm_theme_mode`가 없으므로 §3.1 첫 부팅 흐름을 따른다(시스템 추종 1회 후 저장).
- 신규 사용자: 동일하게 §3.1 흐름.
- 기존 DevPanel `themeOverride`는 그대로 유지(behavior unchanged, 우선순위만 명시 정리).

## 11) DoD (Gate 3)

- Subscription 탭에 "테마 설정" 카드가 노출되고 라이트/다크 Segmented가 동작한다.
- 토글 → 즉시 화면 전체 전환 + SecureStore에 값 저장.
- 앱 강제 종료 후 재실행 시 마지막 모드가 유지된다.
- OS 다크/라이트 변경 시 사용자 모드가 우선되어 무반응.
- DevPanel `themeOverride === 'system'`이면 사용자 모드가 적용되고, `light`/`dark`로 두면 사용자 모드를 무시하고 강제 적용된다.
- tsc/lint 통과.

## 12) 비범위 / 후속 트랙

- 모바일 토스트 시스템(저장 실패·전환 알림 통합).
- Onboarding/Login 헤더의 빠른 테마 토글.
- 사용자 색상 토큰 커스터마이징(예: 색맹/저시력 보조 팔레트).
- 사용자 테마 선호의 서버 동기화(다중 디바이스 일관성).
- 별도 Settings 탭 신설 후 진입점 이전.

## 13) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. HUMAN 합의 5항목(T1~T5) 반영. h1.
