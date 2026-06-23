---
type: design-spec
project: dietManagement
status: draft
track: mockup-a-internal
parent: docs/requirements/feature-mobile-food-search-history-prd.md
updated_at: 2026-06-23
tags: [design, mockup, mobile-app, food-search, dual-design-a]
---

# 음식 검색·섭취 이력 — 안 A (자체 로컬 목업)

PRD: [`feature-mobile-food-search-history-prd.md`](../requirements/feature-mobile-food-search-history-prd.md) (approved, v0.1)

## 0) 트랙 개요

- 안 A = 코드베이스 내 **목업 전용 라우트**(`mock-internal`)의 클릭 가능한 정적 프로토타입.
- 안 B(Stitch)와 **동일한 PRD·상태 스펙**을 입력으로 사용한다.
- 토큰은 모바일 앱 `apps/mobile/src/theme.tsx`와 정합(라이트/다크, primary `#16a34a`/`#22c55e`).

## 1) 목업 실행

```bash
cd mock-internal
npm run dev
```

- 진입: 허브(`/`) → `APP_FOOD_SEARCH 음식 검색·이력·빈도 (신규)` 또는 `/app/food-search`.
- 통계 탭(`/app/stats`) 상단의 **"음식 검색"** 버튼으로도 진입(PRD C-5: 통계 탭 진입점).
- 우상단 "테마" 버튼으로 라이트/다크 전환.

## 2) 화면 구조 (위→아래)

1. **검색 입력** — placeholder "음식명 검색". 포커스+검색어 있을 때 자동완성 드롭다운(예: 신라면 / 신라면 블랙 / 진라면 매운맛). PRD C-4.
2. **기간 프리셋 Segmented** — `30일 / 90일 / 전체`, 기본 90일. 선택 시 primary 강조. PRD C-6 / AC-08.
3. **빈도 요약 카드**
   - "이 기간 동안 **12번** 먹었어요"
   - "마지막 섭취: 3일 전 (6/20 점심)"
   - "주로 간식으로 7번 · 저녁 3번 · 아침 2번" (끼니 분포, 많은 순 최대 3개). PRD C-7 / AC-09.
4. **섭취 이력 리스트** — 카드형 행, 날짜 + 끼니(+간식 위치) + 음식명 + kcal. 행 탭 → 그날 식단(`PastMealBrowse`)으로 이동(목업은 정적). PRD C-3·C-9 / AC-04·AC-10.
5. **페이지네이션** — 하단 중앙 꺽쇠(‹ 1 2 ›).

## 3) 상태 스펙 (StatePicker로 토글)

| 상태 | 표현 |
|---|---|
| 기본(검색어 있음) | 빈도 카드 + 끼니 분포 + 이력 리스트 + 페이지네이션 |
| 기본(검색어 없음) | "음식명을 검색해 보세요" + 최근 먹은 음식 칩(탭 시 검색). PRD C-8 |
| 로딩 | 스켈레톤 3줄 |
| 빈 데이터 | "이 기간에 \"…\" 기록이 없어요" + "이 기간 0번". AC-06 |
| 오류 | danger 배너 + 재시도 버튼 |
| 권한 제한 | info 배너 "로그인이 필요해요" (앱에서는 LoginScreen reset). AC-07 |

## 4) 디자인 토큰·반응형·다크모드

- 모바일 프레임(`max-width: 390px`)로 앱 화면 폭 시뮬레이션.
- 색/간격은 `mock-internal/src/index.css` CSS 변수(앱 `theme.tsx` 톤과 정합).
- 라이트/다크 모두 카드·배너·칩 대비 확인(테마 토글).

## 5) 구현 파일 (목업)

- `mock-internal/src/pages/app/AppFoodSearch.tsx` (신규)
- `mock-internal/src/App.tsx` (라우트 `food-search` 추가)
- `mock-internal/src/pages/app/AppStats.tsx` (진입 버튼 추가)
- `mock-internal/src/pages/MockHub.tsx` (허브 링크 추가)

## 6) 안 A 특징 (비교용)

- **장점:** 앱 토큰과 즉시 정합, 코드 재사용 경로가 명확(선택 시 RN 화면으로 이전 용이), 상태 5종을 토글로 즉시 검증.
- **한계:** 비주얼 탐색 폭은 좁음(자체 톤 1종). 화려한 시안 대안은 안 B(Stitch)에서 탐색.
