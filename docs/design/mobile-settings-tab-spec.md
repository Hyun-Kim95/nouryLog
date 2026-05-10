---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-mobile-settings-tab-prd.md
related:
  - docs/design/mobile-theme-toggle-spec.md
  - docs/design/mobile-toast-spec.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [design, mobile, settings, navigation, dark-mode]
---

# 모바일 Settings 탭 디자인 스펙 v0.1 (draft)

## 0) 출처 / 67-dual-design-exemption 면제 사유

본 트랙은 정식 룰 `.cursor/rules/67-dual-design-exemption.mdc`의 면제 조건을 모두 충족하므로 **이중 안 A/B 작성을 면제**하고 단일 디자인 스펙으로 진행한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | "기존 화면(Subscription) 카드 2개를 신규 화면(Settings)으로 이전 + 알림 슬롯 placeholder 1개 추가". 컴포넌트 신규 도입 0(기존 `Segmented`/카드 패턴 그대로). 신규 화면 1개이지만 내용은 기존 카드 재배치 ⇒ 좁은 스코프로 분류. |
| 2. 디자인 SSOT 존재 | `apps/mobile/src/theme.tsx` 토큰 + 직전 트랙(toggle, toast) 카드 패턴이 SSOT. PRD `feature-mobile-settings-tab-prd.md` v0.1 §3 와이어 + §9 면제 사전 정합. |
| 3. 면제 사유 §0 명시 | 본 절. 스코프 분류 = "단일 신규 화면, 카드 재배치 + placeholder 1", SSOT = `theme.tsx` 토큰, 재사용 컴포넌트 = `Segmented` + 카드 패턴. |

면제 적용 후에도 §4·§6·§7·§9·§11에서 5상태·라이트/다크·시각 점검 체크리스트를 그대로 명세한다.

## 1) 진입점 / 라우팅

- 진입: 모바일 하단 탭 바 5번째(마지막) "설정" 탭 → `SettingsScreen`.
- 내부 액션:
  - "프로필 편집" 탭 → 기존 `RootStackParamList.ProfileEdit` 라우트로 push.
  - 테마 토글 → `useUserThemeMode().setUserMode` 직접 호출(화면 이동 없음).
  - 알림 슬롯 → 비활성(클릭 불가, "준비 중" 캡션).

## 2) 시각 사양

### 2.1 화면 컨테이너

```
SafeAreaView (top + left + right edges)
  ScrollView
    paddingHorizontal: spacing.lg (16px)
    paddingTop: spacing.lg
    paddingBottom: spacing.xxl
    gap: spacing.md (12px) — 카드 사이 간격
```

### 2.2 헤더

- "설정" 텍스트 (display 사이즈, fontWeight 700).
- 부제: "프로필·테마·알림을 한 곳에서 관리해요." (body 사이즈, fgMuted).
- gap: spacing.xs (4px).

### 2.3 카드 1 — 내 프로필

```
┌──────────────────────────────────────┐
│  내 프로필                            │ caption + fgMuted + 700
│  활동량·목표를 입력하면 권장 칼로리와 │ body + fg
│  단백질 계산이 더 정확해집니다.       │
│  [ 프로필 편집 ] (primary 풀폭 버튼)  │
└──────────────────────────────────────┘
```

- 패딩: spacing.md (12px), borderRadius: radius.md (8px).
- 배경: surface, 보더: border 1px.
- 버튼: primary 배경 + primaryFg 텍스트, fontWeight 700.

### 2.4 카드 2 — 테마

```
┌──────────────────────────────────────┐
│  테마                                 │ caption + fgMuted + 700
│  라이트와 다크 모드를 직접 선택할 수  │ body + fg
│  있어요. 변경 즉시 반영되고 다음 실행 │
│  에도 유지됩니다.                     │
│  [ Segmented<라이트 | 다크> ]         │
└──────────────────────────────────────┘
```

- 패딩·보더 카드 1과 동일.
- Segmented는 `useUserThemeMode().userMode` 바인딩.

### 2.5 카드 3 — 알림 (준비 중 슬롯)


```
┌──────────────────────────────────────┐
│  알림                                 │ caption + fgSubtle + 700
│  식사 시간 알림과 권장량 미달 알림이  │ body + fgMuted
│  곧 추가될 예정이에요.                │
│  ··· 점선 보더(dashed) ···            │
└──────────────────────────────────────┘
```

- 보더: `borderStyle: dashed`, borderColor: `borderStrong` (Phase K에서 모바일 `theme.tsx`에 `borderStrong` 토큰 신규 도입 완료. light `#cbd5e1` / dark `#475569`).
- 배경: surface 또는 surface2.
- 클릭 비활성 — `Pressable` 사용 안 함.
- accessibilityHint: 없음 (정적 안내 텍스트).

### 2.6 토큰 매핑

| 요소 | 라이트 | 다크 |
|---|---|---|
| 화면 배경 | bg `#f9fafb` | bg `#0b1117` |
| 카드 배경 | surface `#ffffff` | surface `#161b22` |
| 카드 보더 | border `#e2e8f0` | border `#30363d` |
| 점선 보더 (알림 슬롯) | borderStrong `#cbd5e1` | borderStrong `#475569` |
| 카드 헤더 (caption) | fgMuted | fgMuted |
| 본문 텍스트 | fg | fg |
| 알림 슬롯 본문 | fgMuted | fgMuted |
| primary 버튼 | primary `#16a34a` / primaryFg `#ffffff` | primary `#22c55e` / primaryFg `#052e16` |
| danger 버튼 (계정 카드 로그아웃) | danger `#b91c1c` / dangerFg `#ffffff` | danger `#fca5a5` / dangerFg `#7f1d1d` |

### 2.7 카드 4 — 계정 (Phase M v0.4 신규)

```
┌──────────────────────────────────────┐
│  계정                                 │ caption + fgMuted + 700
│  로그인된 계정에서 로그아웃해요. 다음  │ body + fg
│  진입 시 로그인 화면이 표시됩니다.    │
│  [ 로그아웃 ] (danger 풀폭 버튼)      │
└──────────────────────────────────────┘
```

- 패딩·보더·radius 카드 1·2와 동일.
- 본 v0.4 시점에는 사용자 이메일을 표시하지 않는다. GET `/me/profile`이 email 미반환 + SecureStore 저장 흐름 부재. 후속 트랙에서 LoginScreen 저장 흐름 추가 시 이메일 1줄 추가 가능.
- 로그아웃 버튼은 파괴적 액션이므로 danger 토큰. 일반 버튼(primary)와 시각적으로 다른 톤.
- 인터랙션: 탭 → `Alert.alert` 확인 다이얼로그 ("로그아웃하시겠어요?" / "다음 진입 시 로그인 화면이 표시됩니다.") → 사용자가 "로그아웃" 선택 시 `clearTokens()` + `navigation.reset({ index: 0, routes: [{ name: 'Login' }] })` + info 토스트 "로그아웃했어요." 발화. 취소 시 그대로 머무름.
- 오류 처리: `clearTokens()` 실패 시 error 토스트로 메시지 표시(SecureStore 예외 등 매우 드문 케이스). 재시도 가능하도록 화면은 그대로 머무름.

## 3) 인터랙션

- 카드 1 버튼 탭 → ProfileEdit 라우트 push.
- 카드 2 Segmented 탭 → 선택 즉시 테마 변경 + SecureStore 저장(기존 동작).
- 카드 3 → 비활성, 시각만.
- 카드 4 (Phase M) 로그아웃 버튼 탭 → 확인 다이얼로그 → 토큰 삭제 + Login reset + info 토스트.

## 4) 5상태 매핑

| 상태 | 표현 |
|---|---|
| 기본 | 카드 4개 정적 노출 |
| 로딩 | N/A (정적 메뉴 화면, 데이터 fetch 없음) |
| 빈 데이터 | N/A |
| 오류 | 카드 4 로그아웃 처리 실패 시 error 토스트 (드문 케이스). |
| 완료 | 카드 4 로그아웃 완료 시 info 토스트 + Login 화면 reset. |
| 권한 제한 | ProfileEdit 진입 시점에 인증 만료 확인 후 LoginScreen reset (기존 흐름). |

## 5) 반응형 / 안전 영역

- 화면 폭 ≥ 360 가정. 좌우 패딩 spacing.lg(16px) 유지.
- SafeAreaView edges: `top + left + right` (하단은 BottomTab이 처리).
- 가로 회전: 세로 우선(현재 시스템 추종).

## 6) 다크모드 / 토큰 정합

- `useTheme()` 직접 사용. 라이트/다크 자동 전환.
- 점선 보더는 다크에서도 `borderStrong` 토큰으로 자연스러운 대비 확보.
- DevPanel `themeOverride` 강제 시에도 정상 동작.

## 7) 접근성

- 카드 1 버튼: `accessibilityRole="button"`, label "프로필 편집".
- Segmented: 기존 컴포넌트 a11y 유지(`accessibilityRole="radio"`).
- 알림 슬롯: `accessibilityRole="text"`, label "알림 — 준비 중. 식사 시간 알림과 권장량 미달 알림이 곧 추가될 예정이에요."
- 카드 4 로그아웃 버튼: `accessibilityRole="button"`, label "로그아웃". destructive 톤이라 스크린 리더가 "로그아웃 버튼 (위험)"으로 어나운싱 가능(OS 의존).
- 텍스트 대비 4.5:1 이상.

## 8) 토스트 정합

- 본 화면 자체는 토스트를 발화하지 않는다(카드 1·2·3).
- 테마 토글은 즉시 시각 반영으로 충분(별도 토스트 없음).
- ProfileEdit 진입 후 ProfileEdit가 자체 토스트 발화(트랙 2 v0.1 정책).
- **카드 4 (Phase M v0.4)**: 로그아웃 성공 시 info 토스트 "로그아웃했어요.", 실패 시 error 토스트.

## 9) 네비게이션 변경

- `navigation.tsx` `MainTabs`에 5번째 Tabs.Screen 추가.
- 순서: Home → Log → Stats → Sub → **Settings**.
- 라벨: "설정".
- 탭 아이콘: Phase L에서 텍스트 이모지 + 라벨 도입(§13 참조).

## 10) SubscriptionScreen 변경

- "내 프로필" 카드 제거.
- "테마" 카드 제거.
- "구독 · 복구" 영역만 유지.
- 사용하지 않는 import 제거: `Segmented`, `useUserThemeMode`, `THEME_OPTIONS`, `ThemeMode`, `useNavigation`, `RootStackParamList`, `NativeStackNavigationProp`(ProfileEdit 진입에 쓰던 것).

## 11) 시각 점검 체크리스트(t6 + Phase M 검증용)

- [ ] 하단 탭에서 "설정" 탭이 5번째(마지막) 위치에 노출된다.
- [ ] 설정 탭 진입 시 헤더 + 카드 4개(프로필·테마·알림·계정)가 순서대로 보인다.
- [ ] "프로필 편집" 버튼 탭 → ProfileEdit 화면으로 이동.
- [ ] 테마 Segmented "라이트"/"다크" 전환 즉시 반영 + 앱 재실행 후에도 유지(SecureStore).
- [ ] 알림 카드는 점선 보더 + 흐릿한 톤 + 클릭 비활성.
- [ ] 라이트 팔레트에서 4.5:1 대비.
- [ ] 다크 팔레트에서 4.5:1 대비.
- [ ] 구독 탭 진입 시 프로필·테마 카드가 더 이상 보이지 않고 구독·복원 영역만 보인다.
- [ ] DevPanel `themeOverride` 강제 적용 시 설정 화면도 정합.
- [ ] VoiceOver/TalkBack: 각 카드 헤더 + 본문 + 버튼 순으로 자연스럽게 어나운싱.
- [ ] **계정 카드 (Phase M)**: 헤더 "계정" + 안내 + danger 톤 "로그아웃" 버튼이 마지막에 노출.
- [ ] **계정 카드 (Phase M)**: "로그아웃" 탭 → 확인 다이얼로그 노출 → "취소" 시 그대로 머무름 / "로그아웃" 시 토큰 삭제 + Login 화면 reset + info 토스트 "로그아웃했어요." 발화.
- [ ] **계정 카드 (Phase M)**: 라이트/다크 두 팔레트에서 danger 버튼이 4.5:1 이상 대비.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. PRD `feature-mobile-settings-tab-prd.md` v0.1 §3 와이어 + §9 면제 사전 정합 반영. t6-spec.
- 2026-05-09 (v0.2): Phase K — 모바일 `theme.tsx`에 `borderStrong` 토큰 신규 도입(light `#cbd5e1` / dark `#475569`). admin-web `--ds-border-strong`(light `#cbd5e1` / dark `#3f4750`)와 의미·역할 정합, 헥스는 각 플랫폼 베이스 팔레트 유지. §2.5/§2.6 갱신.
- 2026-05-09 (v0.3): Phase L — MainTabs 5탭에 텍스트 이모지 아이콘 + 다크 정합 도입. §13 신설.
- 2026-05-10 (v0.4): Phase M (트랙 12 / B1) — Settings 탭에 4번째 "계정" 카드 신설. §2.6 토큰 매핑에 danger 버튼 행 추가, §2.7 신규(카드 4 사양), §3·§4·§7·§8 갱신, §11 시각 점검 +3.
- 2026-05-10 (v0.5): Phase M (트랙 13 / B2) — MainTabs 탭 아이콘을 텍스트 이모지에서 `@expo/vector-icons`의 Ionicons로 업그레이드. §13.1 라이브러리 결정 변경, §13.2 매핑 표 갱신(focused/unfocused 짝), §13.3 시각·인터랙션 갱신(`opacity` 제거 + `tintColor` 정합), §13.4 접근성 갱신, §13.5 시각 점검 갱신.

## 13) MainTabs 탭 아이콘 (Phase L 신설 → Phase M v0.5 Ionicons 업그레이드)

### 13.0 67-dual-design-exemption 면제

본 변경은 settings-tab 도입의 자연스러운 마무리(좁은 폭 디바이스 라벨 잘림 완화 + 디자인 일관성)이고, 의존성 추가 1개(`@expo/vector-icons`) + 단일 파일 변경(`navigation.tsx`)이라 §0의 67 면제 컨텍스트가 그대로 유효하다. 별도 §0를 다시 적시하지 않고 본 절에서만 면제 근거를 명시한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 단일 파일(`navigation.tsx`) 변경 + 의존성 추가 1개(Expo SDK 표준 라이브러리). |
| 2. 디자인 SSOT 존재 | `theme.tsx` 토큰(primary/fgMuted/bg/border) + Settings 탭 §2 토큰 매핑 + Ionicons 표준 셋이 SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. 스코프 = "5탭 BottomTab.Navigator screenOptions에 tabBarIcon Ionicons 컴포넌트 + 색·라인 토큰 적용", SSOT = `theme.tsx` 토큰 + Ionicons, 재사용 = `Tabs.Navigator` + `@expo/vector-icons`. |

### 13.1 라이브러리 결정 (v0.5)

- **채택**: `@expo/vector-icons`의 **Ionicons** 셋 (Phase M v0.5 업그레이드).
- 사유:
  - **tintColor 정합**: 라이트/다크 토큰 색상이 활성/비활성 양쪽에 자연스럽게 적용된다(라벨과 동일 색).
  - **focused/unfocused 짝 패턴 표준**: Ionicons는 `<name>` (filled) ↔ `<name>-outline` (line) 짝이 거의 모든 아이콘에 정의돼 있어 활성 상태 표현이 일관됨.
  - **디자인 일관성**: 디바이스/OS 간 렌더 차이 없음(폰트 셋 자체 번들).
  - **빌드 사이즈**: Expo 빌드 시 자동 트리쉐이킹 + 번들에 포함된 폰트만 사용. 5탭 사용 시 영향 미미.
- v0.4 이전(Phase L): 텍스트 이모지(🏠/📝/📊/💳/⚙️). 의존성 0, 즉시 적용 가능했지만 컬러 글리프라 tintColor 정합 불가 + OS 간 렌더 차이 가능성 → v0.5에서 업그레이드.

### 13.2 매핑 (v0.5)

| 라우트 | 라벨 | focused (filled) | unfocused (outline) |
|---|---|---|---|
| Home | 홈 | `home` | `home-outline` |
| Log | 기록 | `restaurant` | `restaurant-outline` |
| Stats | 통계 | `stats-chart` | `stats-chart-outline` |
| Sub | 구독 | `card` | `card-outline` |
| Settings | 설정 | `settings` | `settings-outline` |

선택 사유:
- Log → `restaurant`: 식단 기록의 의미가 가장 명확한 글리프(접시·식기 표현). `create-outline`(연필)도 후보였으나 의미 모호.
- Sub → `card`: 결제·구독을 신용카드 글리프로 표현(앱 결제 표준 패턴).

### 13.3 시각·인터랙션 (v0.5)

- 활성 라벨/아이콘 색: `t.colors.primary` (light `#16a34a` / dark `#22c55e`) — `tabBarActiveTintColor`.
- 비활성 라벨/아이콘 색: `t.colors.fgMuted` (light `#475569` / dark `#cbd5e1`) — `tabBarInactiveTintColor`.
- 아이콘은 `tabBarIcon` 함수에서 `color`/`size` 인자를 받아 그대로 위임. focused 분기로 filled/outline 글리프만 교체.
- 라벨 폰트: `fontSize 11`, `fontWeight 600` — 좁은 폭에서 5탭이 한 줄에 들어오도록 살짝 줄임(Phase L과 동일 유지).
- 아이콘 크기: `size ?? 22` (BottomTab 기본). focused/unfocused 동일 크기.
- 탭 바 배경: `t.colors.bg`, 상단 보더: `t.colors.border` 1px (Phase L과 동일 유지).
- v0.4 이전 `opacity 1/0.7` 분기는 v0.5에서 제거 — Ionicons는 tintColor가 정상 작동하므로 색 자체로 활성/비활성을 충분히 구분.

### 13.4 접근성 (v0.5)

- Ionicons는 RN의 `<Text>` 베이스가 아니라 `<Image>` 또는 폰트 글리프 렌더(라이브러리 내부 처리)이며 기본적으로 `importantForAccessibility="no-hide-descendants"` 동등 처리. 추가 a11y 속성 불필요.
- 라벨(`title` 옵션)은 그대로 어나운싱 — VoiceOver/TalkBack에서 "홈, 탭 1/5" 같은 OS 기본 어나운싱 유지.

### 13.5 시각 점검 체크리스트(Phase L → Phase M v0.5 — `visual-inspection-cumulative.md` §9에 반영)

- [ ] 5탭 모두 Ionicons 아이콘 + 라벨이 한 줄에 표시(360px 폭에서 라벨 잘림 없음).
- [ ] 활성 탭 라벨·아이콘 색 = primary, 비활성 = fgMuted (둘 다 `tabBarActiveTintColor`/`tabBarInactiveTintColor` 정합).
- [ ] 활성 탭 아이콘이 filled 글리프(예: `home`, `restaurant`)로 표시, 비활성 탭은 outline(`home-outline` 등)으로 표시.
- [ ] 라이트/다크 두 팔레트에서 탭 바 배경·보더가 화면 본문과 자연스럽게 이어짐.
- [ ] 빈번한 탭 전환 시 깜빡임 없이 즉시 active 색 적용.
- [ ] VoiceOver/TalkBack에서 아이콘을 어나운싱하지 않고 라벨만 어나운싱.
- [ ] iOS·Android 두 OS에서 동일한 글리프 렌더(이모지와 달리 OS 폰트 의존성 없음).
