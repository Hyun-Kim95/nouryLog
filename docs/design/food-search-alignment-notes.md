---
type: design-spec
project: dietManagement
status: draft
track: dual-design-compare
parent: docs/requirements/feature-mobile-food-search-history-prd.md
related:
  - docs/design/food-search-mockup-a-internal.md
  - docs/design/food-search-mockup-b-stitch.md
updated_at: 2026-06-23
tags: [design, dual-design, compare, food-search]
---

# 음식 검색·섭취 이력 — 이중 디자인안 A/B 비교 및 정합 점검

PRD: [`feature-mobile-food-search-history-prd.md`](../requirements/feature-mobile-food-search-history-prd.md) (approved)

- 안 A(로컬 목업): [`food-search-mockup-a-internal.md`](./food-search-mockup-a-internal.md) — `mock-internal` `/app/food-search`
- 안 B(Stitch): [`food-search-mockup-b-stitch.md`](./food-search-mockup-b-stitch.md) — 캡처 [`assets/food-search-mockup-b-stitch.png`](./assets/food-search-mockup-b-stitch.png)

## 1) 공통 입력 (비교 편향 제거)

두 안 모두 동일 PRD·결정(C-1~C-9)·상태 스펙(기본/로딩/빈/오류/권한)·토큰(primary #16a34a, Manrope/Inter)을 입력으로 사용.

## 2) PRD 정합 점검

| PRD 항목 | 안 A | 안 B |
|---|---|---|
| 검색 + 자동완성(C-4) | 입력 + 자동완성 드롭다운(인터랙션 토글) | 입력 + 최근 검색어 칩(드롭다운 변형 후속) |
| 기간 프리셋 30/90/전체·기본 90(C-6/AC-08) | O (버튼 토글) | O (Segmented, 90 강조) |
| 빈도 횟수(C-2/AC-03) | O | O |
| 마지막 섭취 | O | O |
| 끼니 분포 한 줄(C-7/AC-09) | O | O (+막대 시각화) |
| 끼니/간식 위치(C-3/AC-04) | O (간식 위치 텍스트) | 끼니 배지 O, 간식 위치 보강 필요 |
| 이력 탭→그날 이동(C-9/AC-10) | O (행 버튼) | O (행 chevron) |
| 빈 검색어+최근 칩(C-8/AC-10) | O | O |
| 로딩/빈/오류 상태 | O (StatePicker 토글) | O (한 화면 데모) |
| 권한 제한(AC-07) | O (info 배너) | 미표현(앱 공통 흐름으로 대체) |

→ 두 안 모두 핵심 요구·상태를 충족. 차이는 **표현 방식**과 **탐색 폭**.

## 3) 비교표

| 기준 | 안 A (로컬 목업) | 안 B (Stitch) |
|---|---|---|
| 장점 | 앱 토큰과 즉시 정합, RN 이전 경로 명확, 상태 토글로 검증 쉬움 | 비주얼 완성도·시각 위계 높음(배지·막대), 한눈에 보기 좋음 |
| 리스크 | 비주얼 탐색 폭 좁음(자체 톤 1종) | 일부 카피·세부(간식 위치·권한) 보강 필요, 코드 이전 시 재작성 |
| 구현 난이도 | 낮음(기존 mock-internal/앱 패턴 재사용) | 중(스펙→RN 컴포넌트 재구성 필요) |
| 상태 UI 적합성 | 높음(상태별 분기 명확) | 중~높음(데모는 합쳐 표현) |
| 다크모드 | 토글 즉시 확인 | 시드 라이트(제품 다크 별도 반영) |

## 4) 정합 결론

- 범위·상태·플랫폼(모바일) 정합 OK. PRD로 되돌릴 불일치 없음.
- 남은 보강(어느 안 선택이든 구현 시 반영): 간식 `snackPlacement` 라벨, 자동완성 드롭다운 활성, 권한 제한 상태.

## 5) 선택 기록 (확정)

- 제시일: 2026-06-23. 두 안 동시 제시.
- **선택안: 안 B (Stitch)** — 사용자 선택(2026-06-23). 비주얼 완성도·시각 위계(끼니 배지 색상, 빈도 막대)가 높아 채택.
- 제외안(안 A) 사유: 요구 충족은 동일하나 비주얼 탐색 폭이 좁음. 단, 안 A의 상태 토글·앱 토큰 정합은 구현 시 참고로 활용.
- 선택 완료 = 구현 착수(70-client-lifecycle-default). 이후 단계 3(stage3 체크리스트 → Gate 2 → ATDD-lite RED → 제품 구현).
- 구현 시 공통 보강: 간식 `snackPlacement` 라벨, 자동완성 드롭다운 활성, 권한 제한 상태(안 B에 미표현분).
