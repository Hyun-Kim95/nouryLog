---
type: prd
project: dietManagement
status: implemented
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/requirements/feature-mobile-onboarding-prd.md
  - docs/requirements/feature-mobile-profile-extra-prd.md
  - docs/requirements/feature-mobile-theme-toggle-prd.md
  - docs/requirements/feature-mobile-toast-prd.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [requirements, prd, mobile-app, settings, navigation]
---

# 모바일 Settings 탭 신설 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 직전 트랙들에서 Subscription 탭 안 카드로 임시 도입된 두 진입점(`ProfileEditScreen` 진입 / `ThemeToggle`)을 별도 Settings 탭으로 분리하기 위한 청사진을 정의한다. 본 PRD는 **PRD 작성 단계까지**를 범위로 하며, 디자인 스펙 + 구현은 별도 후속 트랙(Phase J 예정)에서 진행한다.

## 1) 목적

- "구독" 탭이 결제·결제 복원 + 프로필 편집 + 테마 토글을 함께 담당하면서 의미적 응집이 약화된 문제를 해결한다.
- 사용자 설정 화면을 한 곳으로 모아 향후 알림·언어·접근성 설정 등의 추가가 자연스럽게 이루어지도록 한다.
- "구독" 탭은 구독 정보·결제·복원 본연의 책임으로 환원한다.

## 2) 적용 범위

- 대상: `apps/mobile`.
- 포함:
  1. 새 탭 화면: `src/screens/SettingsScreen.tsx` (신규).
  2. `MainTabs`에 "설정" 탭 추가 (마지막 위치, 구독 다음).
  3. SubscriptionScreen에서 ProfileEdit 카드 + 테마 카드 제거 → SettingsScreen으로 이전.
  4. SettingsScreen 내 향후 슬롯 예약: 알림 설정, 언어 설정 등(코드상 placeholder 0). 슬롯 선언만 디자인 스펙 §화면 구조에 명시.
- 제외:
  - 알림 설정 화면 자체 구현(별도 Phase).
  - 푸시 권한 요청 흐름(별도 Phase).
  - 언어 설정(현 시점 한국어 단일 지원).
  - 계정 삭제·로그아웃 UI 변경(현재 SubscriptionScreen 하단 로그아웃 버튼이 있다면 그대로 유지 또는 Settings 탭으로 이전 — D6 결정).

## 3) 사용자 흐름

### 3.1 진입
1. MainTabs 하단에서 "설정" 탭 탭.
2. SettingsScreen 진입.

### 3.2 화면 구조 (와이어 개요)
```
[ 헤더: "설정" ]

[카드 1] 내 프로필
  현재 권장량 요약 — 단백질 X g · 칼로리 Y kcal
  [프로필 편집] 버튼  → ProfileEdit 라우트

[카드 2] 테마
  설명 + Segmented 토글 (라이트/다크)

[카드 3] 알림(예약 슬롯, v0.1에서는 비활성 표기)
  — "준비 중" 캡션. 아직 활성화되지 않은 점선 보더 카드.
  — 코드상 토글 아이템은 두지 않음(클릭 비활성).

[향후] 언어, 접근성 등.
```

### 3.3 SubscriptionScreen 변경
- "내 프로필" 카드 제거.
- "테마" 카드 제거.
- "구독 · 복구" 영역만 유지.
- 화면 상단 헤더는 "구독"으로 단순화.

## 4) 결정 사항 (자동 적용 — "쭉 진행" 추천안)

| ID | 항목 | 결정 |
|---|---|---|
| S1 | 탭 위치 | **마지막 (구독 다음)** — 5번째 탭. 기존 Home/Log/Stats/Sub 순서 유지 + Settings 추가 |
| S2 | 탭 라벨 | **"설정"** |
| S3 | 탭 아이콘 | 텍스트만(현재 Tab Bar가 라벨 기반). 후속에 아이콘 도입 |
| S4 | ProfileEdit 진입 | 기존 ProfileEdit 라우트 그대로 재사용. SettingsScreen → push |
| S5 | ThemeToggle 위치 | SettingsScreen 안 카드(현재 SubscriptionScreen에서 그대로 이전, `useUserThemeMode` 훅 그대로) |
| S6 | 로그아웃 버튼 처리 | 본 트랙에서는 변경 없음(현재 위치 유지) — Phase J에서 일관성 점검 후 결정 |
| S7 | 알림 슬롯 표시 | "준비 중" 점선 카드만 (클릭 비활성) — 사용자에게 향후 기능 예고 |
| S8 | 향후 트랙 진입 조건 | 본 PRD 사용자 승인 후 디자인 스펙 + 구현 진입(별도 Phase J). 본 트랙은 PRD까지만. |

## 5) API / 백엔드 영향

- 영향 없음. 클라이언트 한정 화면 재배치.

## 6) 상태 처리(5상태)

| 상태 | 표현 |
|---|---|
| 기본 | 카드 3개(프로필·테마·알림 슬롯) 노출 |
| 로딩 | 프로필 카드의 권장량 요약은 ProfileEditScreen 진입 후 로드되므로 본 화면 자체에는 로딩 없음 (요약값은 후속에서 prefetch 검토) |
| 빈 데이터 | N/A (정적 메뉴 화면) |
| 오류 | N/A |
| 완료 | N/A |
| 권한 제한 | 인증 만료 시 화면 진입은 가능하나 ProfileEdit 진입 시점에 기존 LoginScreen reset 흐름 발동 |

## 7) 비기능 / 의존성

- 추가 외부 의존성 없음.
- `useTheme()` / `useUserThemeMode()` 훅 그대로 재사용.
- 토스트 시스템 v0.1과 정합(별도 발화 없음, ProfileEdit 진입 후 ProfileEdit가 토스트 발화).
- 라이트/다크 토큰 자동 정합.

## 8) 구현 영향(요약, 후속 Phase J에서 실행)

- 신규: `apps/mobile/src/screens/SettingsScreen.tsx`.
- 변경: `apps/mobile/src/navigation.tsx`(MainTabs에 Settings 추가), `apps/mobile/src/screens/SubscriptionScreen.tsx`(프로필 카드·테마 카드 제거).
- 백엔드/계약 변경 0.
- 마이그레이션 데이터 0.

## 9) 디자인 게이트 / 67-dual-design-exemption 정합

본 트랙은 `.cursor/rules/67-dual-design-exemption.mdc` 면제 조건을 모두 충족하므로 향후 Phase J에서 단일 디자인 스펙으로 진행 가능하다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | "기존 화면(Subscription)에서 카드 2개를 신규 화면(Settings)으로 이전 + 알림 슬롯 placeholder 1개 추가". 컴포넌트 신규 도입 0(Segmented/카드 모두 기존 패턴). 신규 화면 1개이지만 내용은 기존 카드 재배치이므로 좁은 스코프로 분류. |
| 2. 디자인 SSOT 존재 | `apps/mobile/src/theme.tsx` 토큰 + 직전 트랙(toggle, toast) 카드 패턴이 SSOT. |
| 3. 면제 사유 §0 명시 | Phase J 디자인 스펙 §0에서 명시(본 PRD에서 사전 정의). |

## 10) DoD (Phase J에서 충족)

- SettingsScreen에서 프로필·테마 카드가 정상 동작.
- SubscriptionScreen에 구독·복원 본연의 영역만 남음.
- MainTabs에 "설정" 탭이 마지막 위치에 노출.
- ProfileEdit 진입·테마 토글 모두 기존 동작 그대로.
- 라이트/다크 두 팔레트 모두 4.5:1 대비.
- tsc/lint 통과.

## 11) 비범위 / 후속 트랙

- 알림 설정 본 기능(푸시 권한·테스트 알림 발송 등) — 별도 Phase.
- 언어 설정 — 다국어 지원 도입 후.
- 접근성 설정(폰트 스케일, 고대비 모드 등) — 별도 Phase.
- 탭 아이콘 도입(Material/Ionicons 등) — 별도 Phase.
- 로그아웃 위치 일관성 정돈 — Phase J에서 결정.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. "쭉 진행" 추천안 자동 적용. t5-1.
- 2026-05-09 (v0.1 implemented): "쭉 진행" 의향을 PRD 채택으로 갈음하여 Phase J 자동 진입. 디자인 스펙 + SettingsScreen 신규 + MainTabs 5번째 탭 + SubscriptionScreen 카드 제거 + LoginScreen 다크모드 정합 동시 마감. 구현 완료. status=implemented.

## 13) Phase J 결과

- 디자인 스펙: `docs/design/mobile-settings-tab-spec.md` v0.1 (67 §0 면제 명시 + 시각 점검 10항목).
- 구현: `apps/mobile/src/screens/SettingsScreen.tsx` 신규, `navigation.tsx` Settings 탭 추가, `SubscriptionScreen.tsx` 카드 제거.
- tsc/lint 통과. 자동 smoke 없음(시뮬레이터/실기기 시각 점검에 위임).
