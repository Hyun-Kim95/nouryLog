---
type: design-spec
project: dietManagement
status: implemented
owner: design-system
updated_at: 2026-05-10
tags: [design, mobile-app, recommendation, nutrition, phase-p, b4, phase-s]
parent_prd: docs/requirements/feature-recommendation-v14-prd.md
evidence: docs/research/recommendation-v14-evidence.md
version: 0.3
---

# 권장 계산 v1.4 디자인 스펙 v0.3 (Phase P/B4 — 67 dual-design 면제, 단일안, Phase S에서 warn 토큰 의미 확장 적용)

## 0) 67 dual-design 면제 사유 (사전 정합)

본 디자인 스펙은 `.cursor/rules/67-dual-design-exemption.mdc`에 따라 **이중 디자인 면제 단일안**으로 진행한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 신규 화면 0, 신규 컴포넌트 0. 기존 3개 화면(`OnboardingScreen` 결과 카드 / `ProfileEditScreen` "현재 권장량" 카드 / `Settings` 알림 카드 helper)에 텍스트 행 + 옵셔널 warnings 행만 추가. 백엔드는 응답 메타 추가 + 정책표 교체로 응답 호환. |
| 2. 디자인 SSOT 존재 | `apps/mobile/src/theme.tsx` 토큰 + `mobile-profile-extra-spec.md` v0.x "현재 권장량" 카드 패턴 + `mobile-onboarding-spec.md` 결과 카드 + `mobile-notifications-spec.md` v0.2 토글 helper 패턴 SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. 부모 PRD `feature-recommendation-v14-prd.md` v0.2 §0 / §8 결정 조합 결과 / §8 67 면제 §0 사전 정합 표와 동시 정합. |

## 1) 범위

PRD `feature-recommendation-v14-prd.md` v0.2 §5/§7/§8 결정 결과 그대로:

- **R1=포함**: `GET /me/profile`도 `recommendationVersion` / `policy` / `warnings` 메타 응답.
- **R2=청소년 maintain-oriented + caution**: `<19` 유저는 `calorieMode='maintain_with_caution'` + `warnings.teen_caution`.
- **R3=고령 보수 delta + protein bump**: `65+` 유저는 칼로리 delta clamp(150,300) + 단백질 최소 1.1 g/kg + `warnings.older_adult_caution`.
- **R4=칼로리 floor**: 자동 추천이 male 1500 / female·unspecified 1200 미만이면 `warnings.low_calorie_floor_applied` + 카드에 보조 텍스트.
- **R5=단백질 자동 상한**: 자동 추천에 한해 2.0 g/kg/day 상한 적용. 사용자가 명시 입력한 값에는 비강제(`policy.proteinPerKg`만 표시).
- **R6=3곳 노출**: ProfileEdit 권장량 카드 + Onboarding 완료 토스트/요약 + Settings 알림 카드 미달 토글 helper.
- **R7=67 면제 단일안**: 이 문서가 단일 디자인 산출물.

상태 처리 모델: 기본 / 청소년 / 고령 / floor / recalc 실패 / warnings 다중 — 5+1.

## 2) 디자인 SSOT 토큰 매핑

| 의미 | 토큰 |
|---|---|
| 카드 배경 | `t.colors.surface2` |
| 카드 테두리 | `t.colors.border` |
| 본문 강조(권장량 수치) | `t.colors.fg` + `fontSize.bodyLg` + `fontWeight: '700'` |
| 라벨/캡션 | `t.colors.fgMuted` + `fontSize.caption` + `fontWeight: '700'` |
| 추정값 보조 | `t.colors.fgSubtle` + `fontSize.caption` |
| caution warnings 행 | **`t.colors.warn`** + `fontWeight: '700'`, 좌측 텍스트 prefix `‘안내 · ’` (Phase S 적용) |
| floor 적용 안내 | `t.colors.fgSubtle` + `fontSize.caption` (info 톤) |

> Phase S(2026-05-10)에서 정식 적용: 별도 신규 토큰 도입 대신 기존 `t.colors.warn`(light `#b45309` amber-700 / dark `#fcd34d` amber-300)의 의미를 `theme.tsx` 주석으로 "주의가 필요한 정보 톤"으로 명시 확장하고, 본 스펙의 warnings 행에 그대로 적용한다. 다크모드 대비 검증 완료(surface2 위에서 충분), 67 §0 좁은 스코프 그대로 유지(theme 신규 토큰 0).

## 3) 안내 문구 (확정 텍스트)

복사·붙여넣기 그대로 사용한다. 추후 카피 변경은 본 스펙 v0.2+에서만 한다.

| 키 | 노출 위치 | 본문 |
|---|---|---|
| `copy.estimate` | ProfileEdit 카드 / Onboarding 결과 카드 | "추정 권장값입니다. 질환·임신/수유·청소년 성장기·고령·근감소 우려·전문 운동 목표가 있으면 전문가와 상담하세요." |
| `copy.teenCaution` | warnings.teen_caution | "안내 · 성장기에는 균형 잡힌 식사가 우선이라 자동 감량/증량은 적용하지 않았어요." |
| `copy.olderCaution` | warnings.older_adult_caution | "안내 · 근감소 예방을 위해 단백질을 보수적으로 올리고 칼로리 변화를 줄였어요." |
| `copy.floorApplied` | warnings.low_calorie_floor_applied | "안내 · 안전 하한이 적용된 칼로리예요. 더 낮추려면 전문가와 상담하세요." |
| `copy.medicalGeneric` | warnings.general_medical_caution | "안내 · 추정값이며 진단·처방을 대체하지 않아요." |
| `copy.versionTag` | ProfileEdit 카드 라벨 우측 | "v1.4" (작은 caption) |
| `copy.notifHelper` | Settings 알림 카드 미달 토글 보조 텍스트 | "추정 권장값 기준으로 알려드려요. 정확한 영양 상담은 전문가에게 문의하세요." |
| `copy.onboardingDone` | Onboarding 저장 후 success 토스트 | "프로필을 저장했어요. 추정 권장량을 다시 계산했습니다." (기존 토스트 본문 부분 교체) |

## 4) 화면별 변경 명세

### 4.1 ProfileEditScreen — "현재 권장량 (자동 계산)" 카드

기준 위치: `apps/mobile/src/screens/ProfileEditScreen.tsx` 379–399줄(현재 카드).

**변경 요소(추가만, 기존 줄 제거 없음):**

```
┌────────────────────────────────────────┐
│ 현재 권장량 (자동 계산)        v1.4    │  ← 라벨 우측 caption 추가 (R6)
│ 단백질 80 g · 칼로리 2200 kcal         │  ← 기존 강조 줄
│ 저장 시 자동으로 다시 계산됩니다.       │  ← 기존 보조 줄
│ 추정 권장값입니다. … (copy.estimate)    │  ← 신규 보조 줄 (항상)
│ ─ warnings 행 (있을 때만, 행마다 1줄) ─ │
│ 안내 · 성장기에는 균형 … (teen)         │
│ 안내 · 근감소 예방을 … (older)          │
│ 안내 · 안전 하한이 … (floor)            │
└────────────────────────────────────────┘
```

- 카드 컨테이너 스타일은 기존 그대로(`padding: t.spacing.md`, `borderRadius: t.radius.md`, `backgroundColor: t.colors.surface2`, `gap: 4`).
- `gap: 4` 유지 → warnings 다중일 때도 줄간격 일관.
- 라벨 행은 `flexDirection: 'row'` + `justifyContent: 'space-between'`로 변경(라벨 좌, `v1.4` 우). caption 동일 톤(`t.colors.fgMuted`).
- 추정 보조 줄은 `t.colors.fgSubtle` + caption.
- warnings 행은 PRD §6.2 `warnings` 배열을 순회해 매핑. 빈 배열이면 행 0개(레이아웃 점유 0).
- prefill 직후(`GET /me/profile`) 메타가 같이 오므로(R1) recalc 호출 없이 즉시 노출.

### 4.2 OnboardingScreen — 저장 직후 결과/토스트

영향 1 — 저장 success 토스트 본문(`OnboardingScreen.tsx` 191줄):

```
'프로필을 저장했어요. 권장량을 다시 계산했습니다.'
→ '프로필을 저장했어요. 추정 권장량을 다시 계산했습니다.'  (copy.onboardingDone)
```

영향 2 — 저장 직후 결과 카드(있다면) 또는 보조 안내(없으면 도입):

- 현재 OnboardingScreen은 저장 후 `goMain()`로 즉시 메인 이동하는 구조이므로, **카드 신규 추가 없이 토스트 본문 수정만 한다**(67 좁은 스코프).
- recalc 실패 토스트는 기존 그대로(`'권장량을 다시 계산하지 못했어요. 잠시 후 다시 시도하세요.'`) 유지.

> 결과 카드를 추가하려는 안은 본 스펙에서 채택하지 않는다. 실제 권장량은 다음 진입에서 ProfileEdit/홈 카드로 확인되며, Onboarding 흐름 길이를 늘리지 않는 것이 우선이다.

### 4.3 Settings 알림 카드 — 미달 토글 helper

기준 위치: `apps/mobile/src/screens/settings/NotificationCard.tsx` 387–401줄("권장량 미달 알림" 토글 + TimeRow 묶음).

**변경 요소(추가만):**

```
─ 1px border ─
[ 권장량 미달 알림 ]                         (●)   ← 기존 ToggleRow
  추정 권장값 기준으로 알려드려요. …           ← 신규 helper (copy.notifHelper)
[ 매일                                  20:00 ]  ← 기존 TimeRow
```

- helper 줄은 `<Text>` 1개. `t.colors.fgSubtle` + `fontSize.caption` + `paddingHorizontal: t.spacing.md` 정도.
- 토글 OFF 상태에서도 helper는 동일 톤으로 표시(미달 알림의 정의가 무엇인지 안내가 항상 보여야 함).
- 시간 변경 행 helper는 변경 없음.

> 식사 알림 토글 helper는 본 스펙에서 추가하지 않는다(권장 계산과 무관 → 67 좁은 스코프).

## 5) 상태 모델

| 상태 | 트리거 | UI |
|---|---|---|
| 기본(adult, default) | `policy.ageBand='adult'` & warnings 비어 있음 | 카드 = 기존 + `v1.4` 라벨 + 추정 보조 줄 |
| 청소년 | `policy.calorieMode='maintain_with_caution'` & `warnings.teen_caution` 포함 | 위 + teen warnings 행 1줄 |
| 고령 | `policy.ageBand='older'` & `warnings.older_adult_caution` 포함 | 기본 + older warnings 행 1줄 (delta clamp가 표면에 보이진 않음) |
| floor 적용 | `warnings.low_calorie_floor_applied` 포함 | 기본 + floor warnings 행 1줄 |
| 다중 | warnings ≥2 | 행을 순서대로 누적 표시(teen → older → floor → generic) |
| recalc 실패 | recalc API 4xx/5xx | 기존 토스트만(`'권장량을 다시 계산하지 못했어요…'`). 카드 본문은 마지막 성공값 유지 |

## 6) 다크모드 / 반응형

- 모든 토큰 사용 → 다크모드 자동 대응. 추가 처리 없음.
- 카드 너비는 부모 ScrollView 내에서 100% 그대로. 작은 디바이스에서도 warnings 행은 줄바꿈 허용(`<Text>` 기본 동작).

## 7) 접근성

- warnings 행은 `accessibilityRole`을 별도로 부여하지 않고 `<Text>` 텍스트로만 전달(스크린리더가 본문을 그대로 읽음).
- 좌측 prefix `‘안내 · ’`로 의미 분리(아이콘 단독 사용 금지 원칙 준수).
- 토글 helper는 접근성 트리에서 토글 라벨과 별개의 텍스트 노드.

## 8) 시각 점검 체크리스트 (Phase P 도입 항목)

ProfileEditScreen:
1. 라벨 행 좌(라벨)·우(`v1.4`) 정렬이 깨지지 않는다.
2. 다크모드에서 `v1.4` caption이 흐릿하지 않다(대비 충분).
3. 추정 보조 줄이 항상 노출된다.
4. warnings 0건일 때 카드 높이가 v1.3 대비 1줄(추정 보조)만 늘어난다.
5. teen + floor 동시 발동 시 행이 순서대로 2개 표시되고 줄바꿈이 자연스럽다.
6. 텍스트 prefix `‘안내 · ’`가 모든 warnings 행에 일관 적용된다.

OnboardingScreen:
7. 저장 success 토스트 본문에 "추정"이라는 단어가 포함된다.
8. recalc 실패 토스트는 기존 본문 그대로다.

Settings 알림 카드:
9. "권장량 미달 알림" 토글 아래 helper 줄이 항상 보인다.
10. 토글 OFF 상태에서도 helper가 동일 톤으로 보인다.
11. 식사 알림 토글에는 helper가 추가되지 않는다.

다크모드/접근성:
12. 다크모드에서 warnings 행이 surface2 위에서 충분히 읽힌다.
13. 스크린리더가 카드 = 라벨 → 권장량 → 보조 → warnings 순서로 읽는다.
14. 토글 라벨 + helper가 별도 노드로 읽힌다.

## 9) 의존성

- 신규 라이브러리: 없음.
- 신규 컴포넌트: 없음.
- 신규 토큰: 없음(`copy.*`는 텍스트 상수만 추가).

## 11) 구현 단계 (단계 4) — 완료

### 11.1 산출물

**서버**
- `apps/server/src/lib/recommendation.ts` — v1.4 정책표 도입.
  - `calculateRecommendationFull()` 신규: `RecommendationFull = RecommendationResult & RecommendationMeta`. 청소년/성인/고령 분기, delta clamp, calorie floor, protein 자동 상한 2.0 g/kg.
  - `calculateRecommendation()`은 v1.3 호환 시그니처 유지(내부에서 `calculateRecommendationFull` 위임).
  - 신규 export 타입: `AgeBand`, `CalorieMode`, `WarningCode`, `RecommendationPolicy`, `RecommendationMeta`, `RecommendationFull`.
- `apps/server/src/routes/me.ts` — R1 결정 적용.
  - `GET /me/profile`: 프로필 반환 시 `calculateRecommendationFull()` 결과 메타(`recommendationVersion`/`policy`/`warnings`)를 응답에 포함. 별도 recalc 호출 없이 prefill 시점에 안내·warnings 표시 가능.
  - `POST /me/recommendation/recalculate`: 응답에도 동일 메타 포함. 저장은 기존대로 `proteinGoalG/calorieGoalKcal` 두 필드만.

**모바일**
- `apps/mobile/src/api/profile.ts` — 타입 확장.
  - `AgeBand`, `CalorieMode`, `WarningCode`, `RecommendationPolicy`, `RecommendationMeta` export.
  - `ProfileGetResponse`/`RecommendationResult`에 `RecommendationMeta` 결합(옵셔널 — 서버 미배포 환경 호환).
- `apps/mobile/src/copy/recommendation.ts` (신규) — 카피 SSOT.
  - `RECOMMENDATION_COPY` 8키(스펙 §3 그대로) + `WARNING_COPY` 매핑 + `sortedWarnings()` (teen → older → floor → generic 순서, 중복 제거).
- `apps/mobile/src/screens/ProfileEditScreen.tsx` — §4.1 적용.
  - 카드 라벨 행: `flexDirection: 'row'` + `space-between`, 우측 `RECOMMENDATION_COPY.versionTag` (caption + `accessibilityLabel="권장 계산 버전 v1.4"`).
  - 추정 보조 줄: 기존 "저장 시 자동…" 줄 다음에 `RECOMMENDATION_COPY.estimate` (`fgSubtle` + caption).
  - warnings 행: `sortedWarnings(recommendation.warnings).map`로 순회, 좌측 prefix `‘안내 · ’` 포함된 텍스트만 표시. 빈 배열이면 행 0.
  - 상태 갱신: GET 응답 + recalc 응답 모두 `warnings`/`recommendationVersion`까지 setState.
- `apps/mobile/src/screens/OnboardingScreen.tsx` — §4.2 적용.
  - 저장 success 토스트 본문을 `RECOMMENDATION_COPY.onboardingDone`("…추정 권장량을 다시 계산했습니다.")로 교체. recalc 실패 토스트는 기존 그대로.
  - 저장 직후 결과 카드는 신설하지 않음(67 좁은 스코프 결정 그대로).
- `apps/mobile/src/screens/settings/NotificationCard.tsx` — §4.3 적용.
  - "권장량 미달 알림" ToggleRow 직후에 `RECOMMENDATION_COPY.notifHelper` 줄 1개 추가(`fgSubtle` + caption + `paddingHorizontal: t.spacing.md`). 토글 OFF 시에도 같은 톤으로 유지(가시성 100%). TimeRow 이전에 표시.
  - 식사 알림 토글에는 helper 추가 안 함(스펙 §4.3 결정 유지).

**검증 (dev smoke)**
- `scripts/dev-smoke/phase-p.mjs` (신규) — v1.4 9개 케이스: login, GET 메타 포함, teen recalc(`maintain_with_caution`), GET 메타 매칭, adult deficit -300, older delta clamp + protein bump, low BMR floor 1200 적용, profile 원상 복구. 9/9 PASS.
- `scripts/dev-smoke/phase-n.mjs` — v1.1~v1.3 회귀. 14/14 PASS.
- `tsc --noEmit -p apps/server/tsconfig.json` — pass (~6.6s).
- `tsc --noEmit -p apps/mobile/tsconfig.json` — pass (~6.6s).
- `ReadLints` (변경 7파일) — clean.

### 11.2 구현 중 결정 (스펙 보강)

| 결정 | 내용 |
|---|---|
| `accessibilityLabel="권장 계산 버전 v1.4"` | `versionTag` 우측 caption은 단순 텍스트 노드만으로는 스크린리더에서 의미가 약하므로 `accessibilityLabel`을 부여. 시각 점검 13(다크모드)에 영향 없음. |
| `sortedWarnings()` 헬퍼 도입 | 서버가 보내는 warnings 순서가 보장되지 않을 수 있어 클라이언트에서 표시 순서를 SSOT(스펙 §5 다중 상태)로 정렬. 중복 코드도 제거. |
| `RecommendationMeta` 옵셔널 | 서버가 v1.3 응답을 반환하는 환경에서도 화면이 깨지지 않도록 `recommendationVersion`/`policy`/`warnings`를 옵셔널로. warnings 누락 시 행 0개. |
| `noteHelper` 위치 | 토글 직후 + TimeRow 이전. 토글 OFF 상태에서도 동일 톤 유지(opacity 1)로 helper 항상 가독성 확보. |

### 11.3 차후 트랙 후보 (본 Phase 외)

- ~~`t.colors.warning` 정식 토큰 도입~~ — **Phase S(2026-05-10)에서 처리 완료**. 신규 토큰 추가 대신 기존 `warn` 토큰을 SSOT로 의미 확장하고 ProfileEdit warnings 행에 적용. `theme.tsx` 주석 보강으로 의미 명확화.
- ~~자동 추천이 아닌 사용자 override 입력 폼(`proteinGoalG`/`calorieGoalKcal` 직접 입력) 도입 시 `warnings.general_medical_caution` 노출 트리거~~ — **Phase T(2026-05-10) 처리 완료**. ProfileEdit 권장량 카드에 토글 + 입력 + reset + medicalGeneric warning 통합. 자세한 내용은 `docs/design/recommendation-override-spec.md` v0.2.
- ~~청소년 안내를 ProfileEditScreen 외 홈/통계 화면으로 확장~~ — **Phase U(2026-05-10) 검토 결과: 보류**. 현재 `HomeScreen`은 OCR/광고 정보만, `StatsScreen`은 일일 영양 합계만 노출하며 **권장량 자체를 노출하지 않아** warnings만 추가하면 맥락 없는 안내가 된다. 향후 StatsScreen에 권장량 대비 충족률(`protein/proteinGoalG` 등)을 도입하는 별도 트랙에서 함께 다룬다.

## 12) 시각 점검 추적 (구현 결과 — 자체 점검)

| # | 항목 | 결과 |
|---|---|---|
| 1 | ProfileEdit 라벨 행 좌·우 정렬 | ✓ `space-between` + caption 동일 톤 |
| 2 | 다크모드 v1.4 caption 가독성 | ✓ `fgMuted` 토큰 사용 |
| 3 | 추정 보조 줄 항상 노출 | ✓ 무조건 렌더 |
| 4 | warnings 0건 카드 높이 v1.3+1줄 | ✓ 추정 보조 1줄만 추가 |
| 5 | teen+floor 다중 표시 | ✓ phase-p teen 케이스로 검증, floor는 별도 케이스로 검증 |
| 6 | warnings prefix 일관 | ✓ `WARNING_COPY` 모든 키가 `‘안내 · ’` 시작 |
| 7 | Onboarding 토스트 "추정" 포함 | ✓ `onboardingDone` 적용 |
| 8 | recalc 실패 토스트 그대로 | ✓ 변경 없음 |
| 9 | NotificationCard helper 항상 보임 | ✓ ToggleRow 직후 무조건 렌더 |
| 10 | 토글 OFF 시 helper 동일 톤 | ✓ helper에 opacity 토글 미적용 |
| 11 | 식사 알림 helper 미추가 | ✓ 추가 안 함 |
| 12 | 다크모드 warnings 행 가독성 | ✓ `fg` 토큰 + 700 weight |
| 13 | 스크린리더 카드 순서 | ✓ Text 노드 순서 = 라벨/v1.4 → 권장량 → 보조 → warnings |
| 14 | 토글/helper 별도 노드 | ✓ ToggleRow + 별도 `<Text>` |

자체 점검 14/14 통과. 실 디바이스 시각 점검은 향후 Phase Q+에 통합되는 시점에 누적 갱신.

## 10) 변경 이력

- v0.1 (2026-05-10) — 초안. PRD v0.2 R1~R7 결정 반영, 67 면제 §0 정합, ProfileEdit/Onboarding/NotificationCard 변화 명세, 5+1 상태 모델, 14항 시각 점검.
- v0.2 (2026-05-10) — 단계 4 구현 완료 반영(`status: implemented`). §11 구현 산출물(서버 2파일/모바일 4파일/dev smoke 1파일 신규) + §11.2 구현 중 결정(접근성 라벨, sortedWarnings, optional 메타, helper 위치) + §11.3 차후 트랙 후보 + §12 시각 점검 자체 결과 14/14.
- v0.3 (2026-05-10, Phase S) — warnings 행 색상 토큰 정식 적용. §2 토큰 매핑을 `t.colors.fg + 700` (임시) → **`t.colors.warn`**으로 갱신. `apps/mobile/src/theme.tsx` `warn` 필드에 의미 주석 보강. ProfileEditScreen warnings 행 `<Text>` color 변경. §11.3 첫 항목을 완료 상태로 정정.
