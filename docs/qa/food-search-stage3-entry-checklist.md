---
type: doc
project: dietManagement
doc_lane: qa
status: ready
parent: docs/requirements/feature-mobile-food-search-history-prd.md
updated_at: 2026-06-23
tags: [qa, stage3, food-search, gate2]
---

# 음식 검색·섭취 이력 — Stage 3 진입 체크리스트

디자인 선택(안 B) 이후 구현 착수 전 점검.

## 1) PRD 확정
- [x] PRD: `docs/requirements/feature-mobile-food-search-history-prd.md` (status approved, v0.1, 2026-06-23)
- [x] 목표/흐름/범위/정책/결정(C-1~C-9) 명시, 미확정 없음

## 2) 디자인 기준 확정
- [x] 선택안: **Stitch (안 B)** — `docs/design/food-search-alignment-notes.md` §5
- [x] 근거/화면 ID: `projects/7726060931590277332/screens/99b7e455af8b432e9828b97c7b0df788`, DS `assets/1329886661735568102`, 캡처 `docs/design/assets/food-search-mockup-b-stitch.png`
- [x] 상태(기본/로딩/빈/오류/권한) 반영 확인
- [x] 모바일 단일 플랫폼, 라이트/다크 토큰 정합(`theme.tsx`)

## 3) Gate 2 진입 준비 (API + 상태 UI)
- [x] API 계약: `docs/requirements/api-contract-v1.16-food-search-delta.md`
  - `GET /me/meals?q=` (name contains, insensitive) — 후방 호환
  - `GET /me/meals/search-summary?q=&from=&to=` → `{ total, lastConsumedAt, bySlot }`
- [x] 상태 UI 정의: PRD §7 (기본/로딩/빈/오류/권한 + 빈 검색어)
- [x] 화면↔계약 용어 정합: mealSlot/snackPlacement, total=빈도
- [x] FE/BE 분할: BE `apps/server` / FE `apps/mobile` (파일 충돌 없음). Integration Owner: 메인 에이전트

### 3d) ATDD-lite (RED→GREEN)
- [x] 서버 순수 로직 acceptance test: `apps/server/src/lib/mealSearch.test.ts` (AC-01/02/03/09 매핑)
- [ ] UI AC(AC-04/05/06/07/08/10): `manual` — 시뮬레이터 시각 점검 (`docs/qa/`에 기록)

## 4) 리스크/오픈 이슈
- 자동완성 드롭다운 활성·간식 위치 라벨·권한 상태: 안 B 미표현분 → 구현에서 보강(C-9 비고)
- `name contains` 인덱스 미적용 → 현재 데이터 규모 위험 낮음, 후속 모니터링

## 5) 승인
- [x] 디자인 선택 = 구현 착수 승인 (2026-06-23, 70-client-lifecycle-default)
