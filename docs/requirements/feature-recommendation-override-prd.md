---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-10
tags: [requirements, prd, recommendation, override, phase-t]
decision_pending: false
version: 0.1
related:
  - docs/requirements/feature-recommendation-v14-prd.md
  - docs/design/recommendation-v14-spec.md
---

# 권장량 사용자 override 입력 PRD v0.1 (Phase T)

## 0) 진행 단계 안내 (client-project-lifecycle)

본 문서는 Phase T(권장량 직접 입력) 산출이다. 사용자 지시 "다음 액션후보들 전체 순서에 맞게 상세하게 계획부터 세워봐 → 본 plan 채택 → 쭉 진행"의 일괄 승인 흐름을 따른다. 단계 1(요구·PRD)은 본 문서로 마감하고, 단계 2(디자인)는 67 dual-design 면제 단일안(`docs/design/recommendation-override-spec.md` v0.1)으로 진입한다.

## 1) 목적

권장 계산 v1.4(자동)는 추정값이다. 사용자는 의료 상담·트레이너 권고·식이요법 등 자체 근거로 단백질·칼로리 목표를 직접 정하고 싶어할 수 있다. 본 기능은 **자동 추천을 그대로 두면서, 사용자가 원할 때 단 1번의 토글로 직접 입력 모드로 전환**하고, **언제든 자동 추천으로 되돌릴 수 있게** 한다.

## 2) 비목표

- 의료/임상 진단·처방 — 본 기능은 입력값을 검증·저장만 하며, "전문가와 상담하세요" 톤의 안내를 강화한다.
- 신규 DB 컬럼·서버 마이그레이션 — 기존 `Profile.proteinGoalG`/`Profile.calorieGoalKcal` 컬럼과 `PUT /me/profile` 검증/저장 로직을 그대로 재사용한다.
- 단계별/시간대별 목표 — 단일 일일 목표 1쌍만 다룬다.

## 3) 시나리오

- A. 사용자가 ProfileEdit를 열면 자동 권장량 카드가 보인다(v1.4 그대로). 카드 하단에 "직접 목표 입력" 토글 1개가 있다(기본 OFF).
- B. 토글 ON → 입력 필드 2개(단백질 g / 칼로리 kcal) + "자동 추천으로 되돌리기" 텍스트 버튼 + `medicalGeneric` warning 줄(`copy.medicalGeneric`)이 노출된다. 입력 필드 초기값은 현재 자동 권장값으로 prefill된다.
- C. 사용자가 값을 변경 후 저장 → `PUT /me/profile`에 `proteinGoalG`/`calorieGoalKcal` 포함 → 자동 recalc은 호출하지 **않는다**(override 우선).
- D. "자동 추천으로 되돌리기" → `POST /me/recommendation/recalculate` 호출 → 응답값을 화면에 반영 + 토글은 OFF로 복귀.
- E. 토글 OFF → 입력 필드와 reset 버튼이 사라지고, 카드는 자동 v1.4 표시로 돌아온다(이미 저장된 override 값이 있어도 카드 표시는 자동 표시 그대로 — 서버는 마지막 저장된 두 필드를 그대로 가지고 있음).

> 토글 상태는 클라이언트 세션 상태이며 영속화하지 않는다. 사용자가 ProfileEdit를 재진입하면 항상 OFF로 시작한다(자동 추천이 기본 흐름임을 강조).

## 4) 범위

### 4.1 핵심

- ProfileEdit 권장량 카드 하단 "직접 목표 입력" 토글 1개.
- 토글 ON 시: 단백질·칼로리 입력 필드 2개(`Field` 컴포넌트 재사용) + "자동 추천으로 되돌리기" 텍스트 버튼 + `medicalGeneric` warning 줄.
- 입력값 검증(클라이언트 + 서버 422 매핑).
- 저장 시 자동 recalc 미호출(override 우선).
- 자동으로 되돌리기 시 recalc API 호출 + 토글 OFF.

### 4.2 비핵심

- 신규 백엔드 엔드포인트.
- 새 DB 컬럼.
- override 상태의 영속 저장(서버는 두 숫자 필드만 가진다 — override 여부는 모르고 알 필요도 없음).

## 5) 결정 결과 (HUMAN 일괄 승인)

| ID | 항목 | 결정 | 근거 |
|---|---|---|---|
| O1 | 입력 범위 | **단백질 30~300 g, 칼로리 800~6000 kcal** (UI helper 표시) — 서버 검증은 기존 0~10000 그대로 유지하되 클라이언트는 사용자 친화 범위로 안내 | DRI/AMDR 범위 + 일반 성인 권장 범위 보조. 서버 호환 유지 |
| O2 | 자동 vs override 관계 | **override 우선, 자동 recalc 미호출** | 사용자 의도 우선, override 의미 명확 |
| O3 | reset 정책 | **"자동 추천으로 되돌리기" 텍스트 버튼 → recalc 호출 + 토글 OFF** | 단일 버튼으로 전환 |
| O4 | manualOverride 메타 | **DB·서버 응답에 추가 없음, 클라이언트 토글 상태로만 관리** | 마이그레이션 0, 호환성 100% |
| O5 | medicalGeneric 노출 | **토글 ON 시 클라이언트가 helper에 `copy.medicalGeneric` 표시** | warnings 배열은 자동 산출 결과이므로 서버 변경 없이 클라이언트 가산 |
| O6 | UI 위치 | **권장량 카드 하단에 토글 1개 + ON 시 펼침** | 자동 카드와 시각 구분 + 진입 비용 최소 |
| O7 | 진입 정책 | **토글 기본 OFF, 매 진입 시 OFF로 초기화** | 자동 추천이 기본 동선 |

## 6) API / 데이터 계약

### 6.1 변경 없음 — 기존 PUT 재사용

`apps/server/src/routes/me.ts`는 이미 다음을 지원한다.

```
PUT /me/profile
body: {
  ...,
  proteinGoalG?: number,     // 0..10000 정수, validateIntegerRange
  calorieGoalKcal?: number,  // 0..10000 정수, validateIntegerRange
}
응답: { ok: true } 또는 422 { code, message, details: { field, allowedMin, allowedMax } }
```

### 6.2 변경 없음 — recalc

`POST /me/recommendation/recalculate`는 이미 응답에 v1.4 메타를 포함한다(Phase P). 본 Phase에서 변경 없음.

### 6.3 모바일 클라이언트 API 확장

`apps/mobile/src/api/profile.ts`의 `SaveProfileInput`에 `proteinGoalG`/`calorieGoalKcal`를 추가한다(현재 누락). `saveProfile()`이 본문에 두 필드를 포함시키도록 한다.

## 7) UI 영향

영향 화면: `ProfileEditScreen`만(67 좁은 스코프 유지). Onboarding과 Settings 알림 카드는 변경 없음.

상태 모델:

| 상태 | 표현 |
|---|---|
| 기본 (override OFF) | v1.4 카드 + 토글(OFF). 토글 위에 1줄 helper "내 목표를 직접 정하고 싶다면…" |
| override ON | 입력 필드 2개 + reset 버튼 + warning 줄 |
| 입력 검증 오류 | 필드별 error 메시지 + 저장 버튼 활성 유지(필드 단위 차단) |
| 저장 성공 (override) | 토스트 "내 목표를 저장했어요." + 카드 권장량 수치는 입력값으로 표시 |
| 저장 성공 (auto reset) | 토스트 "자동 추천으로 되돌렸어요." + 토글 OFF + 카드 권장량 수치는 recalc 응답값 |

상태 처리 매핑은 디자인 스펙에서 위임한다(`docs/design/recommendation-override-spec.md`).

## 8) Gate 1 점검

| 기준 | 상태 |
|---|---|
| PRD 또는 동등 범위 문서 | ✓ 본 PRD v0.1 |
| 화면 기준 | ⏳ 단계 2에서 `recommendation-override-spec.md` v0.1로 작성 → 디자인 승인 게이트 |
| API 계약 | ✓ 신규 계약 0(기존 PUT 재사용). 모바일 타입만 확장 |

## 9) Gate 2 조건

- API 계약: 변경 없음 → 자동 충족.
- 디자인 승인: 단계 2 산출 후 사용자 명시 승인 또는 67 면제 단일안 묶음 승인.
- 상태 UI ↔ API 오류 매핑: 기존 ProfileApiError + field 매핑 그대로.

## 10) 완료 기준

- ProfileEdit에 토글 + 입력 필드 + reset 버튼이 정상 동작.
- override 저장 시 자동 recalc이 호출되지 않음.
- reset 시 recalc 호출 후 카드 갱신.
- 입력 검증 422 매핑 정상.
- dev smoke 회귀(phase-n 14/14 + phase-p 9/9) 무영향.
- 시각 점검 누적에 본 Phase 항목 추가.

## 11) 변경 이력

- v0.1 (2026-05-10) — 초안. O1~O7 결정 일괄 채택. 신규 DB·신규 API 0, 모바일 단일 화면 보강.
