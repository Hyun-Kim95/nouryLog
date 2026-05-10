---
type: design-spec
project: dietManagement
status: implemented
owner: design-system
updated_at: 2026-05-10
tags: [design, mobile-app, notifications, phase-o]
parent_prd: docs/requirements/feature-mobile-notifications-prd.md
version: 0.2
---

# 모바일 알림 본 기능 디자인 스펙 v0.2 (Phase O — 67 dual-design 면제, 단계 4 구현 완료)

## 0) 67 dual-design 면제 사유 (사전 정합)

본 디자인 스펙은 `.cursor/rules/67-dual-design-exemption.mdc`에 따라 **이중 디자인 면제 단일안**으로 진행한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 기존 Settings 탭 §2.5 "알림 (준비 중 슬롯)" 카드 1개를 활성화. 신규 화면 0, 신규 컴포넌트 0(기존 카드/Pressable/Field/Modal 패턴 그대로). expo-notifications 라이브러리 1개 신규(외부 SDK). |
| 2. 디자인 SSOT 존재 | `apps/mobile/src/theme.tsx` 토큰 + `mobile-settings-tab-spec.md` v0.5 §2(카드 1·2·3·4 패턴) + 기존 시간 표시 관습(`HH:mm` ko) SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. 부모 PRD `feature-mobile-notifications-prd.md` v0.2 §10 결정 결과 + §0에서도 동시 정합. |

## 1) 범위

PRD `feature-mobile-notifications-prd.md` v0.2 §10 결정 결과 그대로:

- 위치: Settings 탭 §2.5 알림 카드 안 인라인 (N11=a)
- 라이브러리: `expo-notifications` (N10=a)
- 식사 시간 알림 3개: 08:00/12:30/18:30 (N2=a), 시점별 컨텍스트 메시지 (N3=b), 묶음 ON/OFF + 각 시간 개별 변경
- 권장량 미달 알림 1개: 20:00 (N4 사용자 결정), 동적 본문 (N5b=a), 둘 다 미달 판정 (N5a=c)
- 권한 요청: 카드 첫 탭 (N1=b)
- 저장: SecureStore-only (N6=a)
- Android 채널: 2채널 분리 (N7=a)
- 끄기 UI: 개별 토글 + 모두 끄기 (N8=b)
- 배지: 미사용 (N9=b)

## 2) 화면 구조

### 2.1 진입 흐름

```
Settings 탭
├── 카드 1: 프로필 (기존)
├── 카드 2: 테마 (기존)
├── 카드 3: 알림  ← 본 스펙 영향 범위 (Phase J 대비 활성화 + 본문 교체)
└── 카드 4: 계정 (Phase M 신규)
```

알림 카드 외부 레이아웃·간격·헤더 구조는 `mobile-settings-tab-spec.md` v0.5 §2와 동일.

### 2.2 알림 카드 — 5상태 와이어

#### 2.2.1 상태 A: 권한 결정 안 됨 (`undetermined`)

```
┌─────────────────────────────────────────┐
│ 알림                                    │ caption · fgMuted · 700
│                                         │
│ 식사 시간과 권장량 미달을 알려드릴까요? │ body · fg
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │          알림 켜기                  │ │ primary · primaryFg · md radius
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- 카드 보더: solid `border` (정상 상태 — 점선 보더는 Phase J 슬롯 시점에만 사용).
- "알림 켜기" 버튼 탭 → `Notifications.requestPermissionsAsync()` 호출. 결과에 따라 상태 B 또는 C로 즉시 전환.

#### 2.2.2 상태 B: 권한 허용 (`granted`)

```
┌─────────────────────────────────────────┐
│ 알림                          모두 끄기 │ caption + 우측 텍스트 버튼(danger·700)
├─────────────────────────────────────────┤
│ 식사 시간 알림                  [ON]    │ body · 토글 1
│ ─────────────────────────────────────── │
│   아침               08:00 ›            │ body · 시간 행 — 탭하면 시간 모달
│   점심               12:30 ›            │
│   저녁               18:30 ›            │
│ ─────────────────────────────────────── │
│ 권장량 미달 알림                [ON]    │ body · 토글 2
│   매일               20:00 ›            │
└─────────────────────────────────────────┘
```

- 토글 1·2: 기존 `Switch`(React Native 기본) — `theme.tsx` `primary`로 thumbColor.
- 시간 행: `Pressable` + `accessibilityRole="button"`, 탭 시 시간 선택 모달. 토글이 OFF면 시간 행 흐릿하게(opacity 0.5) + 클릭 비활성.
- "모두 끄기": 우측 상단 텍스트 버튼. `t.colors.danger` 텍스트, 700 weight. 탭 시 확인 Alert(§3.4).
- 토글 OFF 시: 해당 토글 아래 시간 행 흐릿하게 + 알림 자체는 즉시 취소(`Notifications.cancelScheduledNotificationAsync`).

#### 2.2.3 상태 C: 권한 거부 (`denied`)

```
┌─────────────────────────────────────────┐
│ 알림                                    │ caption
│                                         │
│ 알림이 꺼져있어요.                      │ body · fgMuted
│ 기기 설정에서 알림을 켜주세요.          │ body · fgMuted
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │        기기 설정 열기               │ │ secondary 버튼 (border + fg)
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- 카드 전체 흐릿한 톤(opacity 1, 색만 fgMuted 위주). 점선 보더 X — 권한 거부는 "오류 상태"가 아닌 "사용자 의지 결과"이므로 정상 보더.
- "기기 설정 열기" 탭 → `Linking.openSettings()`.

#### 2.2.4 상태 D: 로딩 (권한 조회 중)

```
┌─────────────────────────────────────────┐
│ 알림                                    │ caption
│                                         │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                       │ 스켈레톤 1줄 (height 16, surface2 bg)
└─────────────────────────────────────────┘
```

- 짧음(보통 50ms 이내) — 깜빡 방지 위해 200ms 미만이면 스켈레톤 자체 미표시 옵션 가능.

#### 2.2.5 상태 E: OS 권한 변경 감지 (granted → denied)

- 표현은 상태 C와 동일. 추가 토스트 발송 없음(노이즈 방지, PRD §5.5).
- 단, 카드 안 토글 2개는 자동 OFF 처리 + SecureStore 갱신.

### 2.3 시간 선택 모달

```
┌──────────── Modal ────────────┐
│                               │
│         시간 선택              │ headline · 700
│                               │
│      [ 08 ]  :  [ 00 ]        │ wheel picker (시·분, 분은 5분 단위)
│                               │
│  ┌──────────┐ ┌──────────┐    │
│  │  취소    │ │  저장    │    │ secondary / primary
│  └──────────┘ └──────────┘    │
└───────────────────────────────┘
```

- React Native 기본 휠은 부재 → `@react-native-community/datetimepicker` 또는 자체 Picker 구현.
- 추천: 본 Phase에서는 가벼운 자체 시·분 인풋(또는 Pressable 휠)로 시작. 별도 라이브러리 도입은 후속 Phase 검토.
- **단계 4 구현 시 결정 항목**: `@react-native-community/datetimepicker` 도입 여부 (1개 추가 의존성 vs 자체 구현).
  - **추천 (구현 단계 자동 결정)**: `@react-native-community/datetimepicker` (Expo 호환, 양 OS 네이티브 룩) 도입. 단, expo-notifications + datetimepicker 합쳐 의존성 2개로 67 면제 "신규 컴포넌트 0" 조건 미세 위반 가능성 → 체크 후 자체 구현으로 폴백 가능.
  - **결정 시점**: 단계 4(구현) 첫 커밋 전. 본 게이트가 아닌 구현 디테일 게이트.
- 분 단위: 5분 (08:00, 08:05, 08:10, ...).

### 2.4 토큰 매핑

| 요소 | 라이트 | 다크 |
|---|---|---|
| 카드 보더 | `border` `#e2e8f0` | `border` `#334155` |
| 카드 배경 | `surface` `#ffffff` | `surface` `#0f172a` |
| 카드 헤더 (caption) | `fgMuted` | `fgMuted` |
| 본문 텍스트 | `fg` | `fg` |
| 보조/안내 텍스트 | `fgMuted` | `fgMuted` |
| primary 버튼 (알림 켜기) | `primary` `#16a34a` / `primaryFg` `#ffffff` | `primary` `#22c55e` / `primaryFg` `#052e16` |
| secondary 버튼 (기기 설정 열기) | `border` 보더 + `fg` | `border` 보더 + `fg` |
| 모두 끄기 텍스트 버튼 | `danger` `#dc2626` (700) | `danger` `#f87171` (700) |
| 토글 thumb (ON) | `primary` | `primary` |
| 토글 track (ON) | `primary` 30% alpha | `primary` 30% alpha |
| 시간 행 우측 chevron | `fgMuted` | `fgMuted` |
| 스켈레톤 | `surface2` | `surface2` |
| 모달 backdrop | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` |
| 모달 배경 | `surface` | `surface` |

## 3) 인터랙션

### 3.1 카드 첫 탭 (상태 A)

1. `Notifications.requestPermissionsAsync()` 호출(비동기).
2. 결과:
   - `granted` → 상태 B로 전환. SecureStore에서 토글/시간 로드(없으면 기본값). 식사 토글 OFF + 권장량 미달 토글 OFF로 시작(opt-in 명시 행위 요구).
   - `denied` → 상태 C로 전환.
3. 첫 권한 부여 직후에도 알림은 자동 발송하지 않음 — 사용자가 토글을 ON 해야 발송 시작.

### 3.2 토글 ON (식사 시간)

1. `dm_notif_meal_enabled = 'true'` 저장.
2. `dm_notif_meal_breakfast/lunch/dinner` 없으면 기본값 `'08:00'`/`'12:30'`/`'18:30'` 저장.
3. `Notifications.scheduleNotificationAsync` 3건 등록 (각 시간 daily repeat).
4. 토스트: "식사 시간 알림을 켰어요." (info, 2초).

### 3.3 토글 ON (권장량 미달)

1. `dm_notif_nutrition_enabled = 'true'` 저장.
2. `dm_notif_nutrition_time` 없으면 `'20:00'` 저장.
3. `Notifications.scheduleNotificationAsync` 1건 등록 (daily repeat).
4. 토스트: "권장량 미달 알림을 켰어요." (info, 2초).

### 3.4 모두 끄기

1. Alert: "알림을 모두 끌까요? 켜진 식사 알림과 권장량 미달 알림이 즉시 취소됩니다." [취소] [모두 끄기 — destructive]
2. "모두 끄기" 시:
   - `Notifications.cancelAllScheduledNotificationsAsync()` (단, 본 앱이 등록한 것만 — 본 앱은 다른 알림 미사용이므로 사실상 모두).
   - SecureStore: `dm_notif_meal_enabled = 'false'` + `dm_notif_nutrition_enabled = 'false'` (시간 키는 보존 — 다음 ON 시 재사용).
   - 토스트: "알림을 모두 껐어요." (info, 2초).

### 3.5 시간 행 탭

1. 시간 선택 모달 오픈 (현재 값 프리셋).
2. "저장" 시:
   - SecureStore에 새 시간 저장.
   - 해당 시간대 기존 스케줄 취소 + 새 시간으로 재등록.
   - 모달 닫힘 + 토스트: "시간을 변경했어요." (info, 2초).
3. "취소" 시: 변경 없이 모달 닫힘.

### 3.6 시스템 권한 변경 감지

- `AppState` `change` 리스너 등록 (`Settings 화면 마운트 시).
- `active` 진입 시마다 `Notifications.getPermissionsAsync()` 재확인.
- `granted` → `denied` 전환 시:
  - 토글 2개 자동 OFF (SecureStore 갱신).
  - 화면 상태 C 전환.
  - 토스트는 발송 안 함(노이즈 방지).

## 4) 5상태 매핑 (PRD §8 정합)

| PRD 상태 | 디자인 상태 |
|---|---|
| 권한 결정 안 됨 | A (§2.2.1) |
| 권한 허용 | B (§2.2.2) |
| 권한 거부 | C (§2.2.3) |
| 로딩 (권한 조회 중) | D (§2.2.4) |
| OS 알림 OFF 감지 | E = C 동일 표현 + 자동 OFF 부수 효과 (§2.2.5) |

## 5) 반응형 / 플랫폼 분기

- 모바일 단일 플랫폼이라 데스크톱 분기 없음.
- iPhone SE (375pt) ~ Pro Max (430pt) 사이 카드 너비 안전 범위 안에서 동작.
- 시간 행: chevron + 시간 텍스트 우측 정렬, 타이트한 폭에서도 줄바꿈 없이 한 줄.
- 모달: bottom sheet 형태(iOS 표준) 또는 중앙 modal — 본 Phase는 중앙 modal로 통일(기존 패턴).

## 6) 다크모드 정합

§2.4 토큰 매핑 그대로. 추가 점검:
- 토글 track 30% alpha — 다크에서도 시각적 분리가 유지되도록 primary `#22c55e` 30% = `rgba(34, 197, 94, 0.3)` 사용.
- 모달 backdrop: 다크에서는 `rgba(0,0,0,0.6)` (라이트는 0.4) — 깊이감 강화.
- "모두 끄기" 텍스트 버튼: 다크에서는 `danger` `#f87171`로 자동 전환되어 충분한 대비 확보.

## 7) 접근성

- 카드 헤더: `accessibilityRole="header"`, label "알림 설정".
- "알림 켜기" 버튼: `accessibilityRole="button"`, label "알림 켜기. 권한 요청을 시작합니다.".
- 토글: `accessibilityRole="switch"`, label "식사 시간 알림" / "권장량 미달 알림", state on/off 어나운싱.
- 시간 행: `accessibilityRole="button"`, label "{식사}, 현재 시간 {HH:mm}, 변경하려면 탭하세요.".
- 모달: `accessibilityViewIsModal={true}` (iOS), 포커스 트랩.
- "모두 끄기" 텍스트 버튼: `accessibilityRole="button"`, label "알림 모두 끄기 (위험)".
- "기기 설정 열기" 버튼: `accessibilityRole="button"`, label "기기 설정 열기. 알림 권한을 다시 설정하려면 탭하세요.".
- 대비: 모든 텍스트 4.5:1 이상(라이트/다크 양쪽).

## 8) 토스트 정합

기존 `apps/mobile/src/toast/` 시스템(`useToast`) 재사용. 발송 시점:
- 식사 토글 ON: `info`, "식사 시간 알림을 켰어요."
- 식사 토글 OFF: `info`, "식사 시간 알림을 껐어요."
- 권장량 미달 토글 ON: `info`, "권장량 미달 알림을 켰어요."
- 권장량 미달 토글 OFF: `info`, "권장량 미달 알림을 껐어요."
- 시간 변경: `info`, "시간을 변경했어요."
- 모두 끄기: `info`, "알림을 모두 껐어요."
- 권한 거부 시: 토스트 없음 (카드 자체로 충분).
- 권한 허용 직후: 토스트 없음 (사용자가 다음 토글 ON 행위로 진행).
- expo-notifications 호출 실패: `error`, 메시지는 `e.message` 또는 "알림을 설정하는 중 오류가 발생했어요.".

## 9) 의존성 / 영향 범위

- 신규 의존성: `expo-notifications` (Expo SDK 호환 버전, `npx expo install expo-notifications`).
- 기존 영향:
  - `apps/mobile/src/screens/SettingsScreen.tsx` — 카드 3 본문 교체(준비 중 슬롯 → 본 기능).
  - `apps/mobile/src/userPrefs.ts` — 알림 SecureStore 키 6개 추가(또는 별도 모듈 `notifPrefs.ts` 분리).
  - `apps/mobile/app.json` — `expo-notifications` 플러그인 추가 + Android 권한 자동.
  - 새 모듈: `apps/mobile/src/notifications/` — 권한·스케줄링·메시지 빌더 캡슐화.
- 백엔드 변경: 없음(N6=a SecureStore-only).

## 10) 영향받지 않음

- 다른 Settings 카드(프로필·테마·계정).
- 다른 탭(Home/Log/Stats/Sub).
- LoginScreen / OnboardingScreen.
- admin-web.

## 11) 구현 단계 (단계 4) — 완료 (2026-05-10)

| 트랙 | 산출 | 결과 |
|---|---|---|
| I1 | `expo-notifications@~0.32.17` 설치 + `app.json` 플러그인 등록(`color: #16a34a`) + `setup.ts`(포그라운드 핸들러 + Android 채널 2개 + 권한 래퍼) + App.tsx 부팅 연결 | ✓ |
| I2 | `apps/mobile/src/notifications/` 모듈 — `messages.ts`(시점별 식사 본문 + 둘 다 미달 동적 빌더) + `nutrition.ts`(`/me/profile` + `/meals?page=1&size=100`로 오늘 누적 vs 목표 비교, expo-background-fetch 미도입 — 단순화) + `scheduler.ts`(daily SchedulableTrigger + reconcile + cancelAll) + `index.ts`(re-export) | ✓ |
| I3 | `apps/mobile/src/notifPrefs.ts` SecureStore 6개 키 + getter/setter + 5분 단위 분 정규화 + `loadAllNotifPrefs` 스냅샷 + `disableAll` 일괄 | ✓ |
| I4 | `apps/mobile/src/screens/settings/NotificationCard.tsx` 신규(화면 내 sub-section 분리) + `SettingsScreen.tsx` 카드 3 본문 교체. 5상태(A~E) + 자체 ScrollView 휠 시간 모달(시 24행, 분 12행 5분 단위, snapToInterval) + AppState foreground 진입 reconcile + 토스트 정합 8케이스 | ✓ |
| I검증 | tsc clean(중간 5.8s + 최종 5.0s) + ReadLints clean + Phase N dev smoke 14/14 PASS(서버 회귀 0) | ✓ |
| I5 | `visual-inspection-cumulative.md` v0.3 → v0.4 — §10 알림 본 기능 14항 신규 + §6 알림 슬롯 1항 deprecated, 합산 78→92(실효 90) | ✓ |
| I6 | `admin-stitch-gap-2026-05-08.md` 15회차 갱신 + 본 스펙 v0.1 → v0.2(본 절) + `feature-diet-management-app-prd.md` §15 Phase O 행 "단계 4 완료"로 갱신 | ✓ |

### 11.1 구현 시점 결정 보강

- **시간 선택 모달 라이브러리**: 외부 의존성 없이 자체 ScrollView 휠 picker로 구현(`Column` forwardRef). `@react-native-community/datetimepicker`는 미도입 — 67 면제 "신규 컴포넌트 0" 정합 유지.
- **`fontSize.headline` 부재 발견**: 모달 헤더는 `fontSize.title`로 대체(theme.tsx에 `headline`이 없음). 디자인 스펙 §2.3 와이어 의도(headline 사이즈)는 그대로 유지.
- **알림 카드 sub-section 분리**: `apps/mobile/src/screens/settings/` 디렉토리 신규 생성, `NotificationCard.tsx`는 SettingsScreen 내부에서만 import. 외부 노출 X = 재사용 컴포넌트 신규 도입 아님 = 67 면제 정합.

### 11.2 기존 파일 영향

- `apps/mobile/package.json` — `expo-notifications` 추가.
- `apps/mobile/app.json` — `plugins`에 `expo-notifications` 추가(`color: #16a34a`).
- `apps/mobile/App.tsx` — 부팅 useEffect에 `setupNotifications()` 추가.
- `apps/mobile/src/screens/SettingsScreen.tsx` — "알림 · 준비 중" 카드를 `<NotificationCard />`로 교체 + import.

### 11.3 신규 파일

- `apps/mobile/src/notifPrefs.ts`
- `apps/mobile/src/notifications/setup.ts`
- `apps/mobile/src/notifications/messages.ts`
- `apps/mobile/src/notifications/nutrition.ts`
- `apps/mobile/src/notifications/scheduler.ts`
- `apps/mobile/src/notifications/index.ts`
- `apps/mobile/src/screens/settings/NotificationCard.tsx`

## 12) 시각 점검 체크리스트 (단계 4 후)

- [ ] Settings → 알림 카드 첫 탭 → 권한 모달 노출.
- [ ] 권한 허용 시 카드가 상태 B로 즉시 전환.
- [ ] 권한 거부 시 카드가 상태 C 전환 + "기기 설정 열기" 버튼 동작.
- [ ] 식사 토글 ON → 3개 시간 행 활성 (008:00/12:30/18:30 기본값).
- [ ] 식사 토글 OFF → 3개 시간 행 흐릿(opacity 0.5) + 클릭 비활성.
- [ ] 권장량 미달 토글 ON → 1개 시간 행 활성 (20:00 기본값).
- [ ] 시간 행 탭 → 모달 오픈 + 현재 값 프리셋.
- [ ] 모달 저장 → 토스트 + 시간 행 갱신.
- [ ] "모두 끄기" → Alert → 확인 시 양 토글 OFF + 토스트.
- [ ] 다크모드: 모든 카드/토글/모달/버튼 4.5:1 대비.
- [ ] 라이트 → 다크 전환: 카드 색·보더·토글이 즉시 정합 적용.
- [ ] iOS: 권한 거부 후 카드 → 기기 설정 → 권한 허용 후 앱 복귀 → 자동 상태 B 재진입.
- [ ] Android: 알림 채널이 OS 설정에 `식사 알림`/`권장량 미달 알림` 2개로 분리 노출.
- [ ] 실제 알림 발송 (예약 시간 설정 → 1분 후 발송 확인) 식사 + 권장량 미달.
- [ ] 권장량 미달 알림 본문이 동적으로 부족량을 포함 (proteinSum/calorieSum 비교 결과).
- [ ] proteinGoalG/calorieGoalKcal이 null/0 인 사용자: 권장량 미달 알림 자체 발송 안 됨.

## 13) 변경 이력

- v0.1 (2026-05-10) — 초안. 67 면제 단일안. PRD v0.2 §10 결정 결과 반영.
- v0.2 (2026-05-10) — 단계 4 구현 완료 반영. §11 트랙 I1~I6 결과 + 구현 시점 결정 보강(자체 휠 picker, fontSize 폴백, sub-section 분리) + 기존/신규 파일 목록. status: draft → implemented.
