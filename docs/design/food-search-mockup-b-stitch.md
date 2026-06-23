---
type: design-spec
project: dietManagement
status: draft
track: mockup-b-stitch
parent: docs/requirements/feature-mobile-food-search-history-prd.md
updated_at: 2026-06-23
tags: [design, mockup, stitch, mobile-app, food-search, dual-design-b]
---

# 음식 검색·섭취 이력 — 안 B (Stitch)

PRD: [`feature-mobile-food-search-history-prd.md`](../requirements/feature-mobile-food-search-history-prd.md) (approved, v0.1)
SOP: [`stitch-sop.md`](./stitch-sop.md)

## 0) Stitch 접근 정보 (열람용)

| 항목 | 값 |
|---|---|
| 프로젝트 | `projects/7726060931590277332` — "Diet Management — dual mockup B (PRD 2026-05)" (MOBILE) |
| 디자인 시스템 asset | `assets/1329886661735568102` — "DietManagement DS v1" |
| 생성 화면 | `projects/7726060931590277332/screens/99b7e455af8b432e9828b97c7b0df788` |
| 화면 제목 | "음식 검색 및 섭취 통계" |
| 세션 | `661189487732131456` |
| 디바이스 | MOBILE |
| 모델/에이전트 | PRO_AGENT |

> 사용자는 본인 Stitch 계정(프로젝트 소유자, `userRole: OWNER`)으로 위 프로젝트·화면을 직접 열람할 수 있다.
> 화면 캡처 사본: [`assets/food-search-mockup-b-stitch.png`](./assets/food-search-mockup-b-stitch.png)

## 1) 디자인 시스템 정합

- primary `#16a34a`, roundness ROUND_EIGHT, headline Manrope, body Inter, label Inter — **앱 `apps/mobile/src/theme.tsx`와 동일 톤**.
- colorMode LIGHT 시드(제품은 라이트/다크 동시 지원).

## 2) 화면 구성 (생성 결과)

위→아래로 PRD 화면 스펙과 동일 순서로 생성됨:

1. 헤더 "음식 검색" + 알림 아이콘.
2. 검색 입력 "음식명 검색".
3. 기간 Segmented `30일 / 90일(선택) / 전체`.
4. 빈도 요약(STATS) 카드: "이 기간 동안 12번 먹었어요" + "마지막 섭취: 3일 전 (6/20 점심)" + 끼니 분포 막대 + "주로 간식으로 7번 · 저녁 3번 · 아침 2번".
5. 섭취 히스토리 리스트: 날짜(JUN 20) + 끼니 배지(LUNCH/SNACK/DINNER, 색+텍스트) + 음식명 + kcal·분량 + 행 우측 chevron(그날로 이동).
6. 페이지네이션 `‹ 1 2 ›`.
7. "OTHER STATES REFERENCE" 영역에 상태 데모: 최근 검색어 칩(빈 검색어), 스켈레톤(로딩), "이 기간에 기록이 없어요"(빈 데이터), "다시 시도"(오류).
8. 하단 탭(Today/Stats/Premium/Profile).

## 3) PRD 정합

| PRD 항목 | 반영 |
|---|---|
| C-4 자동완성 | 검색 입력 + 최근 검색어 칩(자동완성 활성 변형은 Stitch suggestion으로 후속 가능) |
| C-6 기간 프리셋(30/90/전체, 기본 90) | 반영(90일 선택 강조) |
| C-7 끼니 분포 한 줄 | 반영 |
| C-3 끼니/간식 위치 | 끼니 배지 반영(간식 위치 세부는 텍스트로 보강 필요) |
| C-9 이력 탭 이동 | 행 chevron으로 표현 |
| AC-06 빈 결과 0번 | "이 기간에 기록이 없어요" 반영 |
| 상태(로딩/빈/오류) | 한 화면 데모로 포함 |

## 4) 한계·후속

- 한 화면에 모든 상태를 데모로 합쳐 표현(실제 앱은 상태별 분기). 비교 목적상 충분.
- 간식 `snackPlacement` 세부 라벨, 자동완성 드롭다운 활성 상태는 필요 시 `generate_variants`/`edit_screens`로 보강 가능(Stitch suggestion 제안됨).

## 5) 최종 프롬프트 요약

음식 검색·이력·빈도 화면(한국어, MOBILE). 검색 입력 + 기간 Segmented(30/90/전체, 90 기본) + 빈도 요약 카드(횟수·마지막 섭취·끼니 분포) + 끼니 배지 이력 리스트 + 페이지네이션. 필수 상태(기본/빈 검색어+최근 칩/로딩/빈 데이터/오류) 포함. 톤: 웰니스, primary #16a34a, Manrope/Inter, 둥근 카드, 다크모드 대비.
