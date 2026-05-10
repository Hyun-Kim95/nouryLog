---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-mobile-profile-extra-prd.md
related:
  - docs/design/mobile-onboarding-spec.md
updated_at: 2026-05-09
tags: [design, mobile, profile, recommendation, stitch]
---

# 모바일 프로필 확장(활동량·목표) 디자인 스펙 v0.1 (draft)

## 0) 출처 / 이중 안 정책

- 안 B(SSOT): Stitch 폴리시드 화면 `fd8994c143c84e6b89d98bbad6ffad35`(키 `APP_ONBOARD`)의 활동량·목표 라디오 영역 + 동 brief(`scripts/stitch/lib/briefs.ts`)의 5·6번 필드.
- 안 A(로컬 와이어): **본 트랙도 작은 범위 예외**로 65-design-gate 이중안 정책에서 제외(미니 PRD §4 D7).
- 사유: 직전 APP_ONBOARD와 동일 화면 보강 + 신규 ProfileEdit는 "Onboarding 폼의 부분 편집판" 수준이라 디자인 변동성이 낮음.
- 보완: ProfileEdit 화면은 본 스펙 §3에 와이어를 텍스트로 충분히 명세하고 별도 안 A를 만들지 않는다. emergent-rule 후보로 "Stitch brief가 충분히 상세한 단일 스텝 모바일 화면은 안 A 면제 가능" 패턴이 두 번째 적용되며, 정식 규칙 승격은 사용자 승인 후.

## 1) 화면 1 — Onboarding 슬롯 (기존 화면 보강)

직전 `mobile-onboarding-spec.md` §1 구조를 유지하면서 4 필드 아래에 다음 두 그룹을 추가한다.

```
…(기존 4 필드: 성별/나이/신장/체중)…

[Group] 활동량 (선택)
helper "입력 시 더 정확한 권장량을 계산해 드려요."
┌──────────────┐
│ ◉ 거의 없음   │  거의 앉아서 생활
├──────────────┤
│ ○ 가벼움      │  가벼운 산책·집안일
├──────────────┤
│ ○ 보통        │  주 3~4회 운동
├──────────────┤
│ ○ 활동적      │  주 5회 이상 강한 운동
└──────────────┘

[Group] 목표 (선택)
helper "현재 체중 대비 권장 칼로리를 가감합니다."
┌──────────────┐
│ ○ 감량        │  현재 체중 대비 −10%
│ ○ 유지        │  현재 체중 유지
│ ○ 증량        │  현재 체중 대비 +10%
└──────────────┘
```

- 기본값: 둘 다 미선택. "다음" 활성 조건은 변동 없음(기존 4 필드만).
- 미선택 상태에서도 저장 가능. 저장 본문에는 키를 보내지 않는다(`undefined` 직렬화 제외).
- 선택 후 다시 같은 옵션을 탭하면 **선택 해제**되어 미입력 상태로 돌아간다(접근성 라벨로 안내).

## 2) 화면 2 — ProfileEdit (신규)

### 2.1 진입

- 경로: Subscription 탭 상단 "내 프로필" 카드의 "프로필 편집" 버튼 → RootStack `ProfileEdit` push.
- 파라미터: 없음. 화면 진입 시 `GET /me/profile`로 prefill.

### 2.2 구조

```
┌──────────────────────────────────────┐
│  ←   프로필 편집           (header bar)│
│                                      │
│  [Field] 성별                         │
│  [Segmented 3]                       │
│                                      │
│  [Field] 나이 / 신장 / 체중            │
│  …                                   │
│                                      │
│  [Group] 활동량 (선택)                 │
│  [Radio 4]                           │
│                                      │
│  [Group] 목표 (선택)                   │
│  [Radio 3]                           │
│                                      │
│  [Card] 권장량(읽기 전용)               │
│  ┌────────────────────────────────┐  │
│  │ 단백질  ___ g · 칼로리  ___ kcal │  │
│  │ 마지막 갱신 2026-05-09 14:00     │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤  sticky bottom (safe-area)
│  [ 저장          ] primary, full     │
│  [ 취소           ] (text button)    │
└──────────────────────────────────────┘
```

- 헤더 좌측 "←"는 navigation.goBack(). 변경 감지 시 확인 다이얼로그.
- 권장량 카드는 v1.3에서 **읽기 전용**(편집 UI 비범위). 값은 prefill 응답 + 저장 후 자동 recalc 결과로 갱신.
- 저장 버튼 활성 조건: 현재 값과 prefill 값이 한 곳이라도 다를 것.

### 2.3 변경 감지

- prefill 시 `initialValues` 보관, 입력 변경마다 비교 → `dirty` 플래그.
- 취소·뒤로가기 시 `dirty`이면 다이얼로그 "변경 사항을 저장하지 않고 나갈까요?" 표시.

## 3) Radio 컴포넌트(공통 신규)

기존 `Segmented`(3개 가로 분할)와 별도로 세로 라디오 카드형 컴포넌트를 도입한다.

### 3.1 사용처
- Onboarding(활동량 4·목표 3), ProfileEdit(활동량 4·목표 3). 추후 다른 폼에서 재사용.

### 3.2 인터페이스

```ts
type RadioOption<T extends string> = {
  value: T;
  label: string;       // 메인 라벨
  description?: string; // 보조 한 줄
};

type RadioGroupProps<T extends string> = {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (next: T | null) => void; // 같은 값 재탭 시 null 전달
};
```

### 3.3 시각

- 각 옵션은 `surface` 위 `border` 카드. 선택 시 `border = primary`, 좌측에 `primary` 6px 인디케이터.
- 라이트 다크 두 팔레트 모두 4.5:1 대비.
- `accessibilityRole="radio"`, `accessibilityState={{ selected }}`.

## 4) 상태 (5상태)

### 4.1 Onboarding (기존 + 신규 슬롯)

| 상태 | 표현 |
|---|---|
| 기본 | 모든 입력 활성. 라디오 미선택 상태에서도 "다음" 활성 조건은 기존 4 필드 유효성만 |
| 로딩 | 라디오 비활성 포함 전체 비활성 |
| 검증 오류 | enum 위반 422 시 그룹 helper 위치에 빨간 메시지 |
| 통신 오류 | 화면 상단 배너(기존과 동일) |
| 완료 | 토스트 + Main reset |

### 4.2 ProfileEdit

| 상태 | 표현 |
|---|---|
| 기본 | prefill 후 dirty 추적, 저장 비활성 |
| 로딩(prefill) | 폼 영역 스켈레톤(라벨 + 입력 placeholder shape, 800ms 후 노출) |
| 로딩(저장) | 입력 비활성, "저장" 스피너 |
| 검증 오류 | 인라인 + 422 details.field 매핑 |
| 통신 오류 | 화면 상단 빨간 배너 + "다시 시도" |
| 완료 | 토스트 + navigation.goBack() |
| 권한 제한 | 401/403 → `clearTokens` + Login reset |

## 5) 반응형 / 안전 영역

- Onboarding: 기존 그대로(390x844 기준, sticky bottom + KeyboardAvoidingView).
- ProfileEdit: 동일 패턴. 컨텐츠 max-width 480dp 유지(태블릿 가운데 정렬).
- 가로 회전: 세로 우선(시스템 추종, 화면 단위 잠금 없음).

## 6) 다크모드 / 토큰

직전 스펙 §6 라이트/다크 팔레트 그대로 사용. 라디오 카드는 다음 토큰을 추가 사용:

| 용도 | 토큰 |
|---|---|
| 라디오 카드 배경(미선택) | `surface` |
| 라디오 카드 보더(미선택) | `border` |
| 라디오 카드 보더(선택) | `primary` |
| 좌측 인디케이터 | `primary` |
| 보조 설명 | `fgMuted` |
| 비활성 라디오 | `surface2`, 텍스트 `fgSubtle` |

토큰 키 추가 없음. 기존 `theme.tsx` 그대로 활용.

## 7) 인터랙션 / 모션

- 라디오 카드: 선택 시 200ms 색·border-color 트랜지션. 같은 카드 재탭 시 fade로 미선택으로 복귀.
- 저장 버튼: dirty=false → opacity 0.5 + disabled. dirty=true → 정상.
- ProfileEdit 진입 push: 기본 stack push 모션(좌→우 슬라이드, native-stack 기본).

## 8) 접근성

- 라디오 그룹: `accessibilityRole="radiogroup"` 컨테이너 + 옵션마다 `radio` 역할.
- 같은 값 재탭으로 미선택 시 `accessibilityHint`에 "한 번 더 탭하면 선택을 취소합니다." 제공.
- 폰트 스케일: 시스템 추종.

## 9) 구현 노트(F 트랙용)

### 저장 본문 정책 (v0.1.1 명시)

`ProfileEditScreen.onSave`는 prefill `initial`과 현재 `form`을 키별로 비교하여 변경된 필드만 `saveProfile` 본문에 포함한다.

- `form.activityLevel === initial.activityLevel`이면 키 미전송(undefined → 변경 없음).
- `form.activityLevel`이 `null`이고 `initial.activityLevel`이 enum 값이면 `null` 키 포함(명시적 clear).
- `form.activityLevel`이 enum 값이고 `initial.activityLevel`과 다르면 enum 키 포함.

`OnboardingScreen.onSubmit`은 첫 입력이라 form 전체를 보낸다(미선택 라디오는 그대로 `null`로 전달되며, 신규 사용자의 경우 DB에도 NULL로 저장되어 권장 계산 시 안전 기본값으로 동작).



- `apps/mobile/src/components/RadioGroup.tsx` 신규. `Field`/`Segmented` 패턴과 helper/error props 일관화.
- `apps/mobile/src/screens/OnboardingScreen.tsx`: `ActivityLevel`/`Goal` 상태 + RadioGroup 추가, 저장 본문에 미선택 시 키 생략.
- `apps/mobile/src/screens/ProfileEditScreen.tsx` 신규: prefill `GET /me/profile`, 변경 감지, 저장 후 recalc, navigation.goBack().
- `apps/mobile/src/api/profile.ts`: `getProfile(token)` 추가, `ProfileInput`에 `activityLevel?` / `goal?` 옵셔널 추가, `RecommendationResult` 그대로.
- `apps/mobile/src/screens/SubscriptionScreen.tsx`: 상단에 "내 프로필" 카드 + "프로필 편집" 버튼 추가(진입점).
- `apps/mobile/src/navigation.tsx`: `RootStack`에 `ProfileEdit` 라우트 추가(headerShown: true, title "프로필 편집").
- 기존 `Segmented`/`Field`는 그대로 사용.

## 10) 수동 시각 점검 체크리스트(b6 검증용)

> DevPanel은 직전 트랙에서 추가됨. 본 트랙은 추가 dev 토글 없이 그대로 활용한다.

- [ ] Onboarding: 활동량/목표 미선택 → "다음" 정상 동작, 권장값이 안전 기본값으로 계산됨.
- [ ] Onboarding: 같은 라디오 재탭 → 미선택으로 복귀.
- [ ] ProfileEdit 진입: prefill 정상, 권장량 카드 표시.
- [ ] ProfileEdit: 입력 변경 → "저장" 활성, 변경 없는 상태에서는 "저장" 비활성.
- [ ] ProfileEdit: dirty 상태에서 ← 또는 "취소" → 확인 다이얼로그 → 진행/취소 동작.
- [ ] ProfileEdit: 저장 성공 → 토스트 + 이전 화면 복귀, Subscription 카드의 권장값 갱신.
- [ ] ⚙️ DevPanel saveProfile 5xx 강제 → ProfileEdit 상단 배너.
- [ ] ⚙️ DevPanel recalc 실패 강제 → 저장은 성공, 토스트 경고.
- [ ] 라이트/다크 두 팔레트에서 라디오 카드 대비 4.5:1 이상.

## 11) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. 미니 PRD v0.1 D1~D7 결정 반영. b2.
- 2026-05-09 (v0.1.1): §9 구현 노트에 ProfileEditScreen 저장 시 `initial`과 `form`을 비교한 diff만 보내는 정책 명시. saveProfile 본문은 `undefined`=변경 없음, `null`=명시적 clear 의미론을 따른다. b6.
