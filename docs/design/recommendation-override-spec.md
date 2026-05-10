---
type: design-spec
project: dietManagement
status: implemented
owner: design-system
updated_at: 2026-05-10
tags: [design, mobile-app, recommendation, override, phase-t]
parent_prd: docs/requirements/feature-recommendation-override-prd.md
version: 0.2
---

# 권장량 사용자 override 디자인 스펙 v0.2 (Phase T — 67 면제 단일안, 구현 완료)

## 0) 67 dual-design 면제 사유 (사전 정합)

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 신규 화면 0, 신규 컴포넌트 0(기존 `Field`/`<Switch>`/`<Pressable>`/`<Text>` 재사용). 영향 화면은 `ProfileEditScreen`의 권장량 카드 1곳뿐. 백엔드는 기존 PUT 재사용. |
| 2. 디자인 SSOT | `apps/mobile/src/theme.tsx` 토큰 + `mobile-profile-extra-spec.md` 권장량 카드 + Phase P `recommendation-v14-spec.md` v0.3 카피 8키 + Phase O 알림 카드의 `<Switch>` 사용 패턴이 SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. PRD v0.1 §0/§5도 동시 정합. |

## 1) 범위

PRD §5 결정 결과 그대로:

- override 토글 1개 (`<Switch>`), 기본 OFF.
- ON 시 입력 필드 2개(`Field`) + "자동 추천으로 되돌리기" 텍스트 버튼 + `medicalGeneric` warning.
- 토글 상태는 클라이언트 세션 한정(영속화 없음).

## 2) 디자인 SSOT 토큰 매핑

| 의미 | 토큰 |
|---|---|
| override 카드 영역 | 기존 권장량 카드 안 — 추가 컨테이너 없음, `gap`으로 분리 |
| 토글 라벨 | `t.colors.fg` + `fontSize.body` + `fontWeight: '600'` |
| 토글 helper | `t.colors.fgSubtle` + `fontSize.caption` |
| 입력 필드 | `Field` 컴포넌트 기본 토큰 그대로 |
| reset 텍스트 버튼 | `t.colors.primary` + `fontSize.caption` + `fontWeight: '600'` |
| medicalGeneric warning | `t.colors.warn` + `fontSize.caption` + `fontWeight: '700'` (Phase S 정합) |
| 입력 helper(범위 안내) | `t.colors.fgMuted` + `fontSize.caption` |

## 3) 카피 (확정 텍스트)

| 키 | 노출 | 본문 |
|---|---|---|
| `override.toggleLabel` | 토글 라벨 | "직접 목표 입력" |
| `override.toggleHelperOff` | 토글 OFF 시 helper | "내 목표를 직접 정하고 싶다면 켜세요. 자동 추천 대신 입력값을 저장합니다." |
| `override.toggleHelperOn` | 토글 ON 시 helper | "추정 권장값 대신 직접 입력한 목표를 저장합니다." |
| `override.proteinLabel` | 단백질 입력 라벨 | "단백질 목표" |
| `override.proteinHelper` | 단백질 helper | "권장 30~300 g/일. 정수만 입력해 주세요." |
| `override.calorieLabel` | 칼로리 입력 라벨 | "칼로리 목표" |
| `override.calorieHelper` | 칼로리 helper | "권장 800~6000 kcal/일. 정수만 입력해 주세요." |
| `override.resetButton` | 텍스트 버튼 | "자동 추천으로 되돌리기" |
| `override.resetSuccess` | 자동 reset success 토스트 | "자동 추천으로 되돌렸어요." |
| `override.saveSuccess` | override save success 토스트 | "내 목표를 저장했어요." |
| `override.saveError` | 저장 실패 토스트 | (기존 ProfileApiError.message 그대로 재사용 — 신규 카피 없음) |

> `medicalGeneric` 본문은 Phase P 카피(`RECOMMENDATION_COPY.medicalGeneric` = "안내 · 추정값이며 진단·처방을 대체하지 않아요.")를 그대로 사용한다. 본 스펙에서는 신규 카피로 추가하지 않는다.

## 4) 화면 변경 명세

기준: `apps/mobile/src/screens/ProfileEditScreen.tsx` 권장량 카드(현재 ~410줄 부근).

```
┌─────────────────────────────────────────┐
│ 현재 권장량 (자동 계산)         v1.4    │  ← 기존 그대로
│ 단백질 80 g · 칼로리 2200 kcal           │  ← override ON이면 입력값으로 갱신
│ 저장 시 자동으로 다시 계산됩니다.         │  ← 기존 그대로
│ 추정 권장값입니다. …                     │  ← 기존 그대로
│ ─ warnings (있을 때) ─                  │  ← 기존 그대로 (자동 산출 warnings)
│                                         │
│ ─ 1px t.colors.border, marginVertical:s ─│  ← 신규 구분선
│                                         │
│ [ 직접 목표 입력 ]                  (●) │  ← 신규 토글 행 (라벨 좌, Switch 우)
│   <toggleHelperOff 또는 toggleHelperOn> │  ← 신규 helper 줄
│                                         │
│  ─ override ON일 때만 ─                 │
│  [Field: 단백질 목표]                    │  ← 신규 Field
│    helper: 권장 30~300 g/일…             │
│  [Field: 칼로리 목표]                    │  ← 신규 Field
│    helper: 권장 800~6000 kcal/일…        │
│  안내 · 추정값이며 …(medicalGeneric)     │  ← warn 톤 1줄
│  [자동 추천으로 되돌리기]                │  ← 텍스트 버튼 (Pressable, primary)
└─────────────────────────────────────────┘
```

- 구분선: 기존 알림 카드의 `<View style={{ height:1, backgroundColor: t.colors.border, marginVertical: t.spacing.xs }} />` 패턴 재사용.
- 토글 행: `flexDirection:'row'` + `justifyContent:'space-between'` + `alignItems:'center'`. RN `<Switch>`만 사용(신규 컴포넌트 0).
- override 영역은 토글 ON일 때만 렌더(언마운트 → 다시 마운트 OK, 상태는 카드 외부 useState로 보존).
- 입력 필드 초기값:
  - 토글 ON 직후: `recommendation.proteinGoalG`/`recommendation.calorieGoalKcal`을 string 변환해 prefill.
  - 사용자가 한 번이라도 입력하면 그 값을 유지(prefill 로직은 토글 ON 전이 시점에만 실행).
- reset 버튼: `Pressable` + `<Text style={{ color: t.colors.primary }}>`. 누르면 `recalcRecommendation()` 호출 → 응답으로 `recommendation` setState + 토글 OFF.
- `medicalGeneric`은 helper 직후 1줄.

## 5) 상태 모델

| 상태 | 트리거 | UI |
|---|---|---|
| 기본(override OFF) | `overrideEnabled === false` | 토글 OFF + helperOff |
| override ON 진입 | 토글 ON | helperOn + 입력 필드 prefill + reset 버튼 + medicalGeneric |
| 입력 중 | 사용자 타이핑 | 필드 dirty 표시 (기존 Field 동작) |
| 검증 오류(클라이언트) | 비정수/범위 외 | 필드별 error 메시지 + 저장 버튼 누를 때 차단 |
| 검증 오류(서버 422) | `ProfileApiError.field === 'proteinGoalG' | 'calorieGoalKcal'` | 해당 필드에 e.message + banner + error toast |
| 저장 성공(override) | save 성공, recalc 호출 안 함 | success toast `override.saveSuccess` + 카드 수치 갱신 + 화면 닫기 |
| reset 진행 중 | reset 버튼 탭 | recalc 진행 표시(기존 busy 패턴 재사용) |
| reset 성공 | recalc 200 | success toast `override.resetSuccess` + 토글 OFF + 카드 수치 갱신 |
| reset 실패 | recalc 4xx/5xx | 기존 recalc 실패 토스트 |

## 6) 다크모드 / 반응형

- 모든 토큰 사용 → 다크모드 자동 대응. `<Switch>`는 RN 기본 색상(테마에서 `trackColor`/`thumbColor` 지정해 `t.colors.primary` 정합).
- 입력 필드는 `Field` 컴포넌트가 다크모드 자동 처리.

## 7) 접근성

- 토글: `accessibilityRole="switch"` + `accessibilityState={{ checked: overrideEnabled }}` + 라벨 자동.
- helper 줄: `accessibilityRole="text"`, 토글과 별도 노드.
- reset 버튼: `accessibilityRole="button"` + `accessibilityLabel="자동 추천으로 되돌리기"`.
- medicalGeneric: 본문 그대로(`'안내 · '` prefix가 의미 분리).

## 8) 시각 점검 체크리스트 (Phase T 도입 항목, 9개)

ProfileEdit override 카드 영역:
1. 토글 OFF 기본 상태에서 helperOff가 1줄 표시되고, 입력 필드/reset/warning이 보이지 않는다.
2. 토글 ON 즉시 입력 필드 2개 + medicalGeneric + reset 버튼이 한 번에 나타난다.
3. ON 직후 입력 필드 prefill이 자동 권장값과 동일한 정수 문자열이다.
4. 비정수 입력(예: "abc", "2.5") 시 클라이언트 검증 오류가 즉시 표시된다.
5. 범위 helper(30~300 / 800~6000)가 항상 보인다.
6. 저장 후 카드 권장량 수치가 입력값으로 갱신된다(자동 recalc이 호출되지 않음).
7. "자동 추천으로 되돌리기" 누르면 토글 OFF + 카드 수치가 자동 권장값으로 즉시 갱신된다.
8. medicalGeneric 행이 `t.colors.warn` 톤으로 라이트/다크 모두 가독.
9. 스크린리더가 토글 → helper → 입력1 → 입력2 → warning → reset 순서로 읽는다.

## 9) 의존성

- 신규 라이브러리: 없음.
- 신규 컴포넌트: 없음(기존 `Field`/`Switch`/`Pressable`/`Text` 재사용).
- 신규 토큰: 없음(`warn` 토큰은 Phase S에서 의미 확장 완료).

## 11) 구현 단계 — 완료 (Phase T)

### 11.1 산출물

**모바일 (단일 화면 보강)**
- `apps/mobile/src/api/profile.ts` — `ProfileInput`에 `proteinGoalG?: number`, `calorieGoalKcal?: number` 추가. `saveProfile()` body에 두 필드 포함 분기.
- `apps/mobile/src/copy/recommendation.ts` — `OVERRIDE_COPY` 11키 + `OVERRIDE_PROTEIN_HINT_MIN/MAX`(30/300), `OVERRIDE_CALORIE_HINT_MIN/MAX`(800/6000) 상수.
- `apps/mobile/src/screens/ProfileEditScreen.tsx` — `Switch` import + override 4개 state(`overrideEnabled`, `proteinOverrideStr`, `calorieOverrideStr`, `overrideErrors`) + `onToggleOverride` + `validateOverride` + `onResetToAuto` + `onSave` 분기 + 카드 안 토글/입력/reset/medicalGeneric 행 JSX. `dirty = formDirty || overrideEnabled`.

**서버**
- 변경 0(이미 `PUT /me/profile`에 `proteinGoalG`/`calorieGoalKcal` 검증·저장 경로가 있어 그대로 재사용).

**dev smoke**
- `scripts/dev-smoke/phase-t.mjs` 신규 — 7 케이스: login, override PUT 200, GET 반영, recalc reset, 음수 422, 비정수 422, restore. **7/7 PASS**.
- `scripts/dev-smoke/all.mjs`에 phase-t 단계 추가, `package.json`에 `smoke:dev:t`.

**검증**
- `npm run smoke:dev` → phase-n 14/14 + phase-p 9/9 + phase-t 7/7 = 30/30 PASS.
- `tsc --noEmit -p apps/mobile/tsconfig.json` clean(~5.9s).
- `ReadLints` 변경 파일 clean.

### 11.2 구현 중 결정

| 결정 | 내용 |
|---|---|
| `dirty = formDirty || overrideEnabled` | 토글이 켜져 있으면 항상 저장 의도가 있다고 보고 저장 버튼 활성. 단, 검증 실패 시 차단. |
| override 저장 시 recalc 미호출 | PRD O2 "override 우선" 정책 그대로. 카드 수치는 입력값으로 즉시 setState. |
| `setRecommendation` reset | reset-to-auto 시 recalc 응답 전체(`policy`/`warnings`/`recommendationVersion`)로 덮어써 v1.4 메타 정합 유지. |
| 422 매핑 | 서버가 `details.field === 'proteinGoalG' \| 'calorieGoalKcal'` 반환 시 `overrideErrors`에 매핑. 다른 필드는 기존 form 매핑. |
| medicalGeneric 사용 | 별도 신규 카피 없이 `RECOMMENDATION_COPY.medicalGeneric` 재사용 → SSOT 단일화. |
| dev smoke restore | 시드 USER 프로필 마지막에 recalc 한 번 더 호출해 자동값으로 정상화. |

## 10) 변경 이력

- v0.1 (2026-05-10) — 초안. PRD v0.1 O1~O7 일괄 채택 반영. 67 면제 §0, 카피 11키, 5+@ 상태 모델, 9항 시각 점검.
- v0.2 (2026-05-10) — 단계 4 구현 완료(`status: implemented`). §11 구현 산출물(모바일 3파일 + dev smoke 1파일 신규) + §11.2 구현 중 결정 6건. dev smoke 7/7 + 통합 30/30 PASS.
