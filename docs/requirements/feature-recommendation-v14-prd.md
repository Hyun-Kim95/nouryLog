---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-10
tags: [requirements, prd, recommendation, nutrition, phase-p, b4]
decision_pending: false
version: 0.2
evidence: docs/research/recommendation-v14-evidence.md
---

# 권장 계산 v1.4 PRD (Phase P/B4, v0.2 — R1~R7 결정 완료, 단계 2 진입)

## 0) 진행 단계 안내 (client-project-lifecycle)

본 문서는 Phase P/B4 산출물이다.

- **단계 1 (요구·PRD 정리)** — 완료 (v0.1 → v0.2). §8 R1~R7 사용자 결정 완료(2026-05-10, "전부 추천대로").
- **단계 2 (디자인 — 67 dual-design 면제 단일안)** — 진입 중. 산출: `docs/design/recommendation-v14-spec.md` v0.1.
- **단계 3 (디자인 승인 게이트)** — 단계 2 산출 후 HUMAN 승인 대기.
- **단계 4 (구현 + 검증)** — 디자인 승인 직후 즉시 진입(70-client-lifecycle-default §2 — 중복 승인 미요구).

R7=67 면제 결정으로 신규 화면 0 + 기존 ProfileEdit/Onboarding 카드 + 알림 카드 보조 문구만 손댄다. R1~R6 결정으로 신규 응답 메타 + 청소년/고령 분기가 확정됐다.

## 1) 목적

- v1.3 추천 로직(Mifflin-St Jeor + 활동계수 + 목표별 단백질 g/kg)을 공개 근거 기반 정책표로 정교화한다.
- 성인 일반 사용자, 청소년(`13-18`), 고령(`65+`) 사용자를 구분해 더 보수적인 자동 추천을 제공한다.
- 권장값을 "의학적 처방"이 아니라 "추정 권장값"으로 명확히 표시한다.
- 현재 구현된 알림 기능의 권장량 미달 판정(`proteinGoalG`, `calorieGoalKcal`)과 호환되도록 기존 응답 필드는 유지한다.

## 2) 비목표

- 질환, 임신/수유, 신장질환, 섭식장애, 전문 선수 영양 처방은 본 Phase 범위가 아니다.
- 의료 상담 챗봇/진단 기능은 만들지 않는다.
- 체지방률, 제지방량, 운동 종류/강도 세분화 입력은 본 Phase에서 추가하지 않는다.
- 단백질 `>2.0 g/kg/day` 추천은 본 Phase에서 자동 제공하지 않는다.

## 3) 근거 요약

상세 출처: `docs/research/recommendation-v14-evidence.md`

| 주제 | v1.4 반영 |
|---|---|
| 일반 성인 단백질 | KDRI RNI `0.91 g/kg/day`, National Academies RDA `0.8 g/kg/day`를 근거로 maintain 하한을 `0.9 g/kg/day`로 둔다. |
| 운동 성인 | ISSN `1.4-2.0 g/kg/day` 범위를 근거로 moderate/active 및 gain/lose의 단백질 계수를 조정하되 자동 상한은 `2.0`. |
| 고령 | ESPEN 건강한 고령자 `1.0-1.2 g/kg/day`를 근거로 `65+` maintain/gain 하한을 `1.1-1.2`로 둔다. |
| 칼로리 | Mifflin-St Jeor 유지. 목표 조정은 단순 `±10%`에서 bounded delta로 변경. |
| 감량 | NIH 계열의 안전 감량 속도/`~500 kcal/day` 참고를 반영하되, 앱은 보수적 범위 `250-500 kcal`로 제한. |
| 청소년 | 제한적 다이어트 자동 처방을 피하고, maintain-oriented 추정 + 전문가 상담 안내로 처리. |

## 4) 현재 v1.3 로직

SSOT: `apps/server/src/lib/recommendation.ts`

```ts
ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

GOAL_CALORIE_FACTOR = {
  lose: 0.9,
  maintain: 1.0,
  gain: 1.1,
}

GOAL_PROTEIN_PER_KG = {
  lose: 1.4,
  maintain: 1.0,
  gain: 1.6,
}
```

## 5) v1.4 정책

### 5.1 BMR / TDEE

- BMR: Mifflin-St Jeor 유지.
- `gender='unspecified'`: v1.3의 `base - 78` 유지(남성 +5 / 여성 -161의 중간값).
- TDEE: 기존 활동계수 유지.

### 5.2 칼로리 목표

기존 목표별 multiplier 대신 bounded delta를 적용한다.

| 사용자군 | `lose` | `maintain` | `gain` |
|---|---|---|---|
| `<19` | maintain-oriented: `TDEE` + caution | `TDEE` | maintain-oriented: `TDEE` + caution |
| `19-64` | `TDEE - clamp(TDEE*0.10, 250, 500)` | `TDEE` | `TDEE + clamp(TDEE*0.08, 200, 400)` |
| `65+` | `TDEE - clamp(TDEE*0.05, 150, 300)` | `TDEE` | `TDEE + clamp(TDEE*0.05, 150, 300)` |

칼로리 floor:

| gender | floor |
|---|---:|
| `male` | `1500 kcal/day` |
| `female` | `1200 kcal/day` |
| `unspecified` | `1200 kcal/day` |

floor는 자동 추천 guardrail이다. 사용자가 직접 목표를 수동 입력하는 경우에는 기존 사용자 override 정책을 유지하되, UI 경고를 표시한다.

### 5.3 단백질 목표

| 사용자군 | 활동량 | `lose` | `maintain` | `gain` |
|---|---|---:|---:|---:|
| `<19` | all | `0.9` | `0.9` | `0.9` |
| `19-64` | sedentary/light | `1.2` | `0.9` | `1.4` |
| `19-64` | moderate/active | `1.6` | `1.2` | `1.6` |
| `65+` | all | `1.2` | `1.1` | `1.2` |

상한:

- 자동 추천 상한: `2.0 g/kg/day`.
- 반올림: `Math.round(weightKg * coefficient)`.

### 5.4 안내 문구

권장량 카드, 온보딩 완료, 프로필 편집 저장 후 recalc 결과 근처에 짧은 안내를 표시한다.

> 추정 권장값입니다. 질환, 임신/수유, 청소년 성장기, 고령·근감소 위험, 전문 운동 목표가 있으면 전문가와 상담하세요.

청소년 특화 안내:

> 성장기에는 제한적 감량/증량 목표보다 균형 잡힌 식사와 전문가 상담이 우선이에요.

## 6) API / 데이터 계약

### 6.1 기존 필드 유지

기존 응답 필드는 유지한다.

```ts
{
  proteinGoalG: number,
  calorieGoalKcal: number
}
```

기존 알림 기능은 위 두 필드만 사용하므로 호환된다.

### 6.2 신규 메타 필드 (추천)

v1.4에서는 계산 근거와 경고를 UI가 표시할 수 있도록 recalc 응답에 선택 메타를 추가한다.

```ts
{
  proteinGoalG: number,
  calorieGoalKcal: number,
  recommendationVersion: '1.4',
  policy: {
    ageBand: 'teen' | 'adult' | 'older',
    proteinPerKg: number,
    calorieMode: 'maintain' | 'deficit' | 'surplus' | 'maintain_with_caution',
    calorieDeltaKcal: number
  },
  warnings: Array<'teen_caution' | 'low_calorie_floor_applied' | 'older_adult_caution' | 'general_medical_caution'>
}
```

**R1 결정 = 포함**. `GET /me/profile` 응답에도 동일한 `recommendationVersion` / `policy` / `warnings` 메타를 포함한다(서버에서 동일 계산 함수 재사용). ProfileEdit prefill 직후 별도 recalc 호출 없이 안내·warnings를 표시할 수 있다.

## 7) UI 영향

UI가 포함되므로 단계 2 디자인 게이트 필요.

영향 화면(R6 결정에 따라 3곳 모두):

- **`OnboardingScreen`** — 저장 후 recalc 성공 토스트 본문에 "추정값" 안내 결합 + 결과 카드(이미 `t.colors.surface2` 권장량 미니 카드 패턴 존재) 하단에 1줄 추정 안내·warnings 표시. 저장/recalc 실패 토스트 동작은 유지.
- **`ProfileEditScreen`** — 기존 "현재 권장량 (자동 계산)" 카드(`apps/mobile/src/screens/ProfileEditScreen.tsx` 379–399줄)에 `recommendationVersion` 라벨 + warnings 행(있을 때만)·"추정값" 보조 문구를 추가.
- **`Settings` 알림 카드** — 권장량 미달(저녁 영양 알림) 토글 helper 문구에 "추정 권장값을 기준으로 알려요" 보조 텍스트 추가. 알림 본문은 동적 계산 그대로(기존 `proteinGoalG/calorieGoalKcal` 필드 사용 → 호환).

상태 처리:

| 상태 | 표현 |
|---|---|
| 기본 | 기존 권장량 카드 + `v1.4` 추정 안내 |
| 청소년 | maintain-oriented 결과 + 청소년 caution |
| 고령 | 보수 조정 + 고령 caution |
| floor 적용 | "안전 하한이 적용됐어요" 보조 문구 |
| recalc 실패 | 기존 토스트/오류 처리 유지 |

## 8) 결정 결과 (HUMAN 승인 완료, 2026-05-10)

사용자가 "전부 추천대로 진행해"로 답변. R1~R7 모두 추천안 그대로 확정.

| ID | 항목 | 결정 | 비고 |
|---|---|---|---|
| R1 | `GET /me/profile`에 `policy/warnings` 메타 포함 | **포함** | recalc 호출 없이 ProfileEdit prefill 시점에도 안내 표시 가능 |
| R2 | 청소년(`<19`) lose/gain 처리 | **maintain-oriented + caution** | 자동 deficit/surplus 미적용. `calorieMode='maintain_with_caution'` |
| R3 | 고령(`65+`) 조정 | **보수 delta + protein minimum bump** | 칼로리 delta clamp(150,300), 단백질 최소 1.1 |
| R4 | 칼로리 floor | **male 1500 / female·unspecified 1200** | 자동 추천 guardrail. 사용자 override 시 경고 표시 |
| R5 | 단백질 자동 상한 | **2.0 g/kg/day** | 자동 추천 한정. 사용자 override는 별도 |
| R6 | 안내 문구 노출 | **ProfileEdit 권장량 카드 + Onboarding 완료 토스트/요약 + 알림 카드 미달 설정 설명** | 3곳 모두 |
| R7 | 디자인 범위 | **67 면제 단일안** | 신규 화면 0, 기존 카드 문구/warnings 행 추가 중심 |

### 결정 조합 결과

- **신규 화면 0개** + 기존 3개 화면(ProfileEdit / Onboarding / Settings 알림 카드) 보조 문구·warnings 행만 추가.
- **신규 백엔드 응답 메타**: `recommendationVersion`, `policy`, `warnings` 3종이 `POST /me/recommendation/recalculate`와 `GET /me/profile` 양쪽에 추가.
- **기존 `proteinGoalG` / `calorieGoalKcal` 필드 유지** → 알림 동적 본문(`scheduleNutrition` / `fetchTodayShortfall`) 호환.
- emergent-rule (B) 본 Phase 미발동(신규 PUT 필드 없음). (C) 미발동(부팅 컨텍스트 변경 없음).

### 67 면제 §0 사전 정합

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 신규 화면 0, 신규 컴포넌트 0(기존 카드/Text 행 패턴 그대로). 백엔드 변경은 응답 메타 추가 + 정책표 교체만으로 응답 호환성 유지. |
| 2. 디자인 SSOT | `theme.tsx` 토큰 + `mobile-profile-extra-spec.md` v0.x 권장량 카드 + Onboarding/알림 기존 카드 패턴이 SSOT. |
| 3. 면제 사유 §0 명시 | `recommendation-v14-spec.md` v0.1 §0 + 본 PRD §0/§8 동시 정합. |

## 9) Gate 1 점검

| 기준 | 상태 |
|---|---|
| PRD 또는 동등 범위 문서 | ✓ 본 PRD v0.2 (R1~R7 결정 완료) |
| 근거 문서 | ✓ `docs/research/recommendation-v14-evidence.md` |
| 화면 기준 | ⏳ 단계 2에서 `docs/design/recommendation-v14-spec.md` v0.1로 작성 → 디자인 승인 게이트 |
| API 계약 초안 | ✓ §6 v0.2 확정. `recommendationVersion` / `policy` / `warnings`가 `GET /me/profile`(R1) + `POST /me/recommendation/recalculate` 양쪽에 추가 |

## 10) 완료 기준

- `apps/server/src/lib/recommendation.ts`가 v1.4 정책표를 사용한다.
- `POST /me/recommendation/recalculate` 및 `GET /me/profile` 계약이 문서와 일치한다.
- 청소년/성인/고령, lose/maintain/gain, 활동량 4단계에 대한 테스트 케이스가 있다.
- 알림 권장량 미달 동적 본문이 기존 필드와 계속 호환된다.
- PRD/근거/디자인/시각 점검 누적 문서가 동기화된다.

## 11) 변경 이력

- v0.1 (2026-05-10) — 공개 근거 조사 반영. v1.4 정책 초안, API 메타 초안, R1~R7 결정 항목 작성.
- v0.2 (2026-05-10) — HUMAN 결정 "전부 추천대로" 반영. `status: approved`, `decision_pending: false`. §0 단계 2 진입 안내, §8 결정 결과 표 + 67 면제 §0 사전 정합 추가. §9 Gate 1 점검 갱신.
