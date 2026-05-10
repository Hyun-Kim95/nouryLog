---
type: design-spec
project: dietManagement
doc_lane: design
parent: docs/requirements/feature-admin-toast-prd.md
related:
  - docs/design/mobile-toast-spec.md
  - .cursor/rules/67-dual-design-exemption.mdc
updated_at: 2026-05-09
tags: [design, admin-web, toast, ux, dark-mode]
---

# admin-web 토스트 시스템 디자인 스펙 v0.1 (draft)

## 0) 출처 / 67-dual-design-exemption 면제 사유

본 트랙은 정식 룰 `.cursor/rules/67-dual-design-exemption.mdc`의 면제 조건을 모두 충족하므로 **이중 안 A/B 작성을 면제**하고 단일 디자인 스펙으로 진행한다.

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | "기존 화면(4페이지) 결과 메시지 슬롯 추가" + "기존 디자인 토큰(`--ds-color-*`)·기존 banner 패턴 재사용 단일 오버레이 보강". 신규 화면 도입 없음. |
| 2. 디자인 SSOT 존재 | `apps/admin-web/src/index.css` 의 `--ds-*` CSS 변수 + 기존 `.banner-success`/`.banner-danger` 시각 패턴이 SSOT. |
| 3. 면제 사유 §0 명시 | 본 절. 스코프 분류 = "단일 오버레이 보강 + 기존 페이지 mutation 슬롯", SSOT = `index.css` `--ds-*` 토큰, 재사용 컴포넌트 = `.banner-*` 패턴. |

면제 적용 후에도 §4·§6·§7·§9·§11에서 5상태·라이트/다크·시각 점검 체크리스트를 그대로 명세한다.

## 1) 진입점 / 마운트 위치

- ToastProvider는 `App.tsx`에서 `ThemeProvider` **안쪽**, `AuthProvider` **안쪽**, `Routes` **바깥쪽**에 마운트.
- 트리: `ThemeProvider` → `AuthProvider` → `ToastProvider` → `Routes` → 모든 페이지.
- 화면 전환과 무관하게 가시 유지. Login → Dashboard 전환 후에도 토스트 잔존 가능.

## 2) 시각 사양

### 2.1 위치 (top-right)

- 컨테이너 위치: `position: fixed; top: var(--ds-space-4); right: var(--ds-space-4);`
- z-index: `1100` (Drawer/Modal `1000`보다 위).
- 폭: `min-width: 280px; max-width: 420px`.

### 2.2 카드 구조

```
┌──────────────────────────────────────┐
│ [icon]  메시지 텍스트                 │
└──────────────────────────────────────┘
```

- `padding: var(--ds-space-3) var(--ds-space-4);`
- `border-radius: var(--ds-radius-md);`
- `border: 1px solid <kind-color>;`
- `background: var(--ds-color-surface);`
- `display: flex; gap: var(--ds-space-2); align-items: center;`
- `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);`

### 2.3 종류별 토큰

| 종류 | 보더 | 아이콘 색 | 배경 | 텍스트 |
|---|---|---|---|---|
| `success` | `var(--ds-color-success)` | `var(--ds-color-success)` | `var(--ds-color-surface)` | `var(--ds-color-fg)` |
| `error` | `var(--ds-color-danger)` | `var(--ds-color-danger)` | `var(--ds-color-surface)` | `var(--ds-color-fg)` |
| `info` | `var(--ds-color-info)` | `var(--ds-color-info)` | `var(--ds-color-surface)` | `var(--ds-color-fg)` |

> 모든 종류가 `surface` 배경 + 종류별 보더/아이콘 강조. 컬러풀 배경은 다크/라이트 두 팔레트 정합 어려움이 있어 회피.

### 2.4 아이콘

텍스트 글리프 사용:
- `success` = "✓"
- `error` = "✕"
- `info` = "ⓘ"

### 2.5 텍스트

- `font-size: var(--ds-text-sm)`, `font-weight: 500`.
- 1~2줄 가정. 3줄 이상은 `-webkit-line-clamp: 3`.
- 대비: 모든 종류 텍스트 vs 배경 4.5:1 이상(라이트/다크).

### 2.6 dismiss 버튼

- 카드 우측에 작은 "✕" 버튼(`button.btn-icon`).
- 클릭 시 즉시 dismiss.
- accessibility: `aria-label="알림 닫기"`.

## 3) 인터랙션 / 모션

### 3.1 발화

- 새 토스트는 스택 위쪽으로 추가됨(top-right이지만 스택 자체는 세로 리스트, 새 항목이 위로).
- 200ms ease-out fade-in + `translateX(20px → 0)`.
- CSS `@keyframes` 사용.

### 3.2 dismiss

- 자동(success/info=3500ms, error=5000ms) 또는 수동(닫기 버튼).
- 200ms fade-out + `translateX(0 → 20px)`.

### 3.3 큐 행동(스택 최대 3)

- 스택 길이 ≤ 3 유지.
- 4번째 토스트 발화 시 가장 오래된 것 즉시 dismiss(fade-out 모션 동반).
- 각 토스트는 독립적으로 자동 dismiss 타이머를 가진다.

## 4) 5상태 매핑

모바일 토스트와 동일(PRD §6).

## 5) API (TypeScript)

```ts
export type ToastKind = 'success' | 'error' | 'info';
export type ToastInput = { kind: ToastKind; message: string };
export type ToastApi = {
  show: (input: ToastInput) => void;
  hide: (id?: number) => void;
};
export function useToast(): ToastApi;
```

- `hide()`: 인자 없으면 모두 dismiss, `id` 제공 시 해당 id만.

## 6) 반응형

- 데스크톱(폭 ≥ 1024): top-right 고정 폭 280~420px.
- 태블릿(768~1023): 동일 위치, max-width 360px.
- 모바일 폭(<768): admin-web 자체가 데스크톱 우선이라 비주력. 그러나 폭 < 480에서는 `right: var(--ds-space-2); left: var(--ds-space-2);`로 양 끝 패딩만 적용해 가독성 유지.

## 7) 다크모드 / 토큰 정합

- `data-theme="dark"` 속성에 따라 `var(--ds-color-*)` 자동 전환.
- 기존 ThemeProvider 토글이 `localStorage` 영속이라 토스트 색도 자동 영속.

## 8) 접근성

- 컨테이너 `role="region"`, `aria-label="알림"`.
- 각 토스트:
  - `success`/`info` → `role="status"`, `aria-live="polite"`.
  - `error` → `role="alert"`, `aria-live="assertive"`.
- 닫기 버튼 `aria-label="알림 닫기"`.
- 키보드: 토스트 자체는 비포커스, 닫기 버튼만 포커스 가능. `Esc`는 후속 트랙.

## 9) 사용처 매핑 (구현 노트)

### 9.1 FoodsPage
- `save()` 성공 → `success` "음식을 저장했어요." (생성/수정 공통 카피).
- `save()` 실패 → 인라인 `setMessage` 유지 + `error` 토스트 동일 메시지.
- `setActive(row, true)` 성공 → `success` "활성으로 전환했어요."
- `setActive(row, false)` 성공 → `success` "비활성으로 전환했어요."
- `setActive` 실패 → `alert()` 제거, `error` 토스트로 교체.

### 9.2 InquiriesPage
- 답변 등록 성공 → `success` "답변을 등록했어요."
- 답변 등록 실패 → 인라인 banner 유지 + `error` 토스트.
- 상태 변경 성공/실패 → 동일 패턴.

### 9.3 NoticesPage
- 작성/수정 성공 → `success` "공지를 저장했어요."
- 작성/수정 실패 → 인라인 banner 유지 + `error` 토스트.
- 활성/비활성 전환 → 동일 패턴.

### 9.4 DashboardPage
- 재집계 성공 → `success` "최신 통계로 반영했어요."
- 재집계 실패 → `error` 토스트.

## 10) CSS 추가 (`index.css`)

```css
.toast-stack {
  position: fixed;
  top: var(--ds-space-4);
  right: var(--ds-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  z-index: 1100;
  pointer-events: none;
  max-width: 420px;
}

.toast-card {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-width: 280px;
  padding: var(--ds-space-3) var(--ds-space-4);
  background: var(--ds-color-surface);
  color: var(--ds-color-fg);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-size: var(--ds-text-sm);
  font-weight: 500;
  animation: toast-in 200ms ease-out;
}

.toast-card.toast-leaving {
  animation: toast-out 200ms ease-in forwards;
}

.toast-card.toast-success { border-color: var(--ds-color-success); }
.toast-card.toast-error { border-color: var(--ds-color-danger); }
.toast-card.toast-info { border-color: var(--ds-color-info); }

.toast-icon {
  font-weight: 700;
  font-size: var(--ds-text-md);
}
.toast-card.toast-success .toast-icon { color: var(--ds-color-success); }
.toast-card.toast-error .toast-icon { color: var(--ds-color-danger); }
.toast-card.toast-info .toast-icon { color: var(--ds-color-info); }

.toast-message { flex: 1; line-height: 1.4; }

.toast-close {
  background: transparent;
  border: 0;
  color: var(--ds-color-fg-muted);
  cursor: pointer;
  font-size: var(--ds-text-md);
  padding: 4px;
}
.toast-close:hover { color: var(--ds-color-fg); }

@keyframes toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes toast-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(20px); }
}

@media (max-width: 480px) {
  .toast-stack {
    left: var(--ds-space-2);
    right: var(--ds-space-2);
    max-width: none;
  }
}
```

> 위 CSS 변수명은 admin-web 기존 패턴 추정. 실제 변수가 다르면 구현 단계에서 매핑.

## 11) 시각 점검 체크리스트(t3-4 검증용)

- [ ] FoodsPage 저장 성공 → 우상단 success 토스트 노출, 3.5s 후 자동 dismiss.
- [ ] FoodsPage 저장 실패 → Drawer 안 banner + 우상단 error 토스트 둘 다 노출, 5s 후 자동 dismiss.
- [ ] FoodsPage 비활성 전환 성공 → success 토스트 "비활성으로 전환했어요."
- [ ] InquiriesPage 답변 등록 성공 → success 토스트 + Drawer 닫힘 + reload.
- [ ] NoticesPage 작성 성공 → success 토스트 "공지를 저장했어요."
- [ ] DashboardPage 재집계 성공 → success 토스트 "최신 통계로 반영했어요."
- [ ] 빠르게 4개 액션 연속 실행 → 스택 최대 3개 유지(가장 오래된 자동 dismiss).
- [ ] 토스트 닫기 버튼 → 즉시 dismiss.
- [ ] 라이트/다크 두 팔레트에서 3 종류 토스트 모두 4.5:1 대비.
- [ ] VoiceOver/스크린리더: success는 polite, error는 assertive.
- [ ] 1024 / 768 뷰포트에서 우상단 위치·max-width 동작.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. PRD v0.1 자동 적용. t3-2.
