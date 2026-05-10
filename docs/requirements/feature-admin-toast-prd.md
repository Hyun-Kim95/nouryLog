---
type: prd
project: dietManagement
status: draft
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/requirements/feature-mobile-toast-prd.md
  - docs/design/admin-toast-spec.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [requirements, prd, admin-web, toast, ux]
---

# admin-web 토스트 시스템 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 직전 모바일 토스트 트랙(`feature-mobile-toast-prd.md` v0.1)과 동일 정책을 admin-web에 도입하여 양 플랫폼 결과 메시지 표시 패턴을 공통화한다. 화면 디자인 SSOT는 `docs/design/admin-toast-spec.md`. 기존 `setMessage`/`alert()` 분산 패턴을 단일 ToastProvider로 통합한다.

## 1) 목적

- 사용자(관리자)에게 **저장·상태 변경·재집계 결과(성공/실패)·경고**를 화면 전환과 무관하게 즉시 알리는 공통 표시 수단을 제공한다.
- `FoodsPage`/`InquiriesPage`/`NoticesPage`/`DashboardPage`에 흩어진 `alert()`·인라인 `setMessage` 패턴을 통합 토스트로 일관화한다.
- 모바일과 동일 정책(success/error/info 3종, 단순 메시지)으로 양 플랫폼 결과 메시지 패턴을 정합한다.

## 2) 적용 범위

- 대상: `apps/admin-web`.
- 포함:
  1. `src/toast/` 신규 모듈(ToastProvider, useToast 훅, Toast 시각 컴포넌트).
  2. CSS 스타일 추가(`index.css`에 `.toast-*` 클래스).
  3. 사용처 도입: FoodsPage(저장/상태 변경) + InquiriesPage(답변 등록/상태 변경) + NoticesPage(저장/상태 변경) + DashboardPage(재집계).
- 제외:
  - 모바일 토스트(별도 트랙 v0.1로 도입 완료).
  - 액션 버튼이 포함된 토스트(예: "되돌리기"). MVP 단순.
  - 토스트 누적·이력 화면.
  - LoginPage 인증 결과 토스트(인라인 메시지 그대로 유지, 후속).

## 3) 사용자 흐름

### 3.1 신규/수정 (FoodsPage·NoticesPage)
1. Drawer/Modal에서 "저장" 클릭.
2. 성공 → 화면 reload + `success` 토스트 "저장했어요."
3. 실패(422·5xx·네트워크) → 인라인 banner 유지 + `error` 토스트.

### 3.2 행 액션 (모든 페이지의 비활성/재활성/상태 변경)
1. 행 액션 버튼 클릭.
2. 성공 → reload + `success` 토스트 "상태를 변경했어요." 또는 종류별 카피.
3. 실패 → `error` 토스트(기존 `alert()` 제거).

### 3.3 답변 등록 (InquiriesPage)
1. Drawer에서 "답변 등록" 클릭.
2. 성공 → reload + `success` 토스트 "답변을 등록했어요."
3. 실패 → 인라인 banner 유지 + `error` 토스트.

### 3.4 재집계 (DashboardPage)
1. "최신값 반영" 클릭.
2. 성공 → reload + `success` 토스트 "최신 통계로 반영했어요."
3. 실패 → `error` 토스트.

### 3.5 토스트 자체
- 발화 → 200ms fade-in + slide-from-right.
- 표시 (success/info=3.5s, error=5s).
- 200ms fade-out.
- 큐: 스택 최대 3개(가장 최신이 위). 상한 초과 시 가장 오래된 것 즉시 dismiss.

## 4) 결정 사항 (자동 적용 — 모바일 추천안 + admin-web 표준)

| ID | 항목 | 결정 |
|---|---|---|
| A1 | 라이브러리 | 자체 구현(React Context + CSS transition) |
| A2 | 표시 위치 | **top-right** (모바일 표준에서 차이; admin-web 일반 패턴) |
| A3 | 표시 시간 | success/info=3.5s, error=5s (모바일과 동일) |
| A4 | 종류 | success / error / info 3종 (모바일과 동일) |
| A5 | 액션 버튼 | 미지원 (MVP) |
| A6 | 큐잉 | **스택 최대 3개** (모바일과 차이; admin-web 화면 폭 충분, 다중 액션 빠른 연속 시나리오 흡수) |
| A7 | 우선 도입처 | 4페이지 mutation: FoodsPage(저장/상태) + InquiriesPage(답변/상태) + NoticesPage(저장/상태) + DashboardPage(재집계) |

> 모바일과 차이는 A2(위치)·A6(큐잉) 두 가지뿐이며, 둘 다 플랫폼 화면 폭/사용 패턴 차이로 인한 표준 적용. 그 외 항목은 동일 정책.

## 5) API / 백엔드 영향

- 영향 없음. 클라이언트 한정.

## 6) 상태 처리(5상태)

모바일 토스트와 동일.

| 상태 | 표현 |
|---|---|
| 기본 | 토스트 큐 비어있음. 화면에 토스트 없음. |
| 로딩 | 화면 자체의 스피너/비활성. 토스트는 즉시 발화. |
| 빈 데이터 | N/A. |
| 오류 | 인라인 banner 유지 + `error` 토스트 보조. |
| 완료 | `success` 토스트 + 화면 reload. |
| 권한 제한 | ForbiddenState 화면 + 필요 시 `error` 토스트. |

## 7) 비기능 / 의존성

- 추가 외부 의존성 없음.
- `useTheme()` 활용 라이트/다크 토큰 정합. `data-theme` 속성 자동 반영.
- 성능: CSS transition만 사용, JS 애니메이션 없음.
- 접근성: `role="status"` (success/info), `role="alert"` (error). `aria-live="polite"|"assertive"`.

## 8) 구현 영향(요약)

- 신규: `apps/admin-web/src/toast/ToastProvider.tsx`, `apps/admin-web/src/toast/useToast.ts`.
- CSS: `index.css`에 `.toast-stack`/`.toast-card`/`.toast-success` 등 추가.
- 변경: `App.tsx`(ToastProvider 마운트), `FoodsPage.tsx`/`InquiriesPage.tsx`/`NoticesPage.tsx`/`DashboardPage.tsx`(mutation 콜백에 토스트 발화).
- 백엔드/계약 변경 0.

## 9) 마이그레이션

- 기존 `setMessage` 인라인 banner는 보존(저장/답변 등록 같이 폼 내부 결과는 폼 안에서도 가시 유지, 토스트는 추가 알림).
- 기존 `alert()` 호출은 토스트로 교체.

## 10) DoD (Gate 3)

- 4페이지 mutation 사용처에서 의도한 종류·메시지로 토스트 발화.
- 라이트/다크 두 팔레트에서 4.5:1 대비.
- 스택 최대 3개 큐잉이 시각적 부조화 없이 동작.
- tsc/lint 통과, vite build 통과.

## 11) 비범위 / 후속 트랙

- LoginPage 인증 결과 토스트.
- 액션 버튼 토스트("되돌리기" 등).
- 토스트 누적·이력 화면.
- 키보드 단축키(예: `Esc`로 모든 토스트 닫기).

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. 모바일 정책 + admin-web 표준 자동 적용. t3-2.
