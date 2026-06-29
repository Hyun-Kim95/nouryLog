---
type: change-summary
project: dietManagement
feature: mobile-meal-set
updated_at: 2026-06-29
tags: [change-summary, qa, mobile-app, meal-set, gate3]
---

# 끼니 세트(즐겨찾기 묶음) 변경 요약 · 검증 기록

> 관련 문서: PRD [`feature-mobile-meal-set-prd.md`](../requirements/feature-mobile-meal-set-prd.md) · 계약 [`feature-diet-management-api-contract-v1.md`](../requirements/feature-diet-management-api-contract-v1.md) (v1.6) · 디자인 [`meal-set-dual-design.md`](../design/meal-set-dual-design.md)

## 1) 무엇을 바꿨나 (요약)
자주 먹는 음식 조합을 **끼니 세트**로 저장하고, 한 번의 동작으로 여러 식사 기록을 일괄 생성하는 기능을 **모바일 앱 전용**으로 추가했다. 백엔드 CRUD + 일괄 등록(apply) API, 앱 3화면(목록·편집·등록 시트), 통합 acceptance 테스트를 포함한다.

## 2) 변경 범위 / 영향
### 백엔드 (`apps/server`)
- **신규 모델**: `MealSet`, `MealSetItem` (`prisma/schema.prisma`) + 마이그레이션 `20260629120000_meal_set`. 기존 `Meal`/`FoodTemplate` 스키마 변경 없음(추가 모델만).
- **신규 라우터** `src/routes/mealSet.ts`: `GET/POST /me/meal-sets`, `GET/PUT /me/meal-sets/:id`, `PATCH /me/meal-sets/:id/deactivate`, `POST /me/meal-sets/:id/apply`. `index.ts`에 마운트(`meRouter`보다 앞).
- **헬퍼** `src/lib/mealSet.ts`: 이름 검증·미래일자(KST)·간식 슬롯 해석·항목별 멱등키 파생·제외 분리·사용 불가 사전 검증.
- **에러 코드 2종 추가**: `NOT_FOUND`(404), `MEAL_SET_ITEM_UNAVAILABLE`(409) — SSOT `contracts/errorCodes.ts` + 서버 스냅샷 `apps/server/src/contracts/errorCodes.ts`.
- **공통 래퍼** `wrap()`: 핸들러 미처리 예외 → `500 INTERNAL_SERVER_ERROR`(me.ts 컨벤션 정합, 비동기 throw로 인한 응답 지연 방지).
- `/health` contract 버전 `v1.5.0 → v1.6.0`.

### 프론트엔드 (`apps/mobile`)
- **API 클라이언트** `src/api/mealSets.ts` + 409 `details.items` 파서. `lib/apiError.ts`에 `details` 노출(추가형).
- **화면**: `screens/MealSetListScreen.tsx`(목록·상태 UI), `screens/MealSetEditorScreen.tsx`(이름/끼니/항목·음식 추가 모달), `components/MealSetApplySheet.tsx`(날짜/끼니 override·사전검증·멱등 등록).
- **유틸/문구**: `lib/mealSetItem.ts`(분량·kcal·사용 불가), `copy/mealSet.ts`.
- **네비게이션**: `MealSetList`/`MealSetEditor` 라우트 + Log 화면 "세트로 한 번에 등록" 진입점.

## 3) 핵심 정책 (계약 §10 / PRD §7)
- 소유권: 타인/없는 세트 = `404 NOT_FOUND`(존재 비노출).
- 멱등: 배치 `clientRequestId` → 항목별 `{clientRequestId}:{itemId}` 파생(`Meal @@unique([userId, clientRequestId])`).
- 원자성: apply는 등록 대상 항목 전체 단일 트랜잭션(전체 성공/실패).
- 사전 검증: 비활성/참조 소실/환산 불가 → `409 MEAL_SET_ITEM_UNAVAILABLE`(`details.items[].{itemId, reason}`); 기본 CTA "문제 항목 제외 후 등록"(D3).
- 미래 일자 차단(`422`, D5), 항목 ≤20 / 활성 세트 ≤50(`422`, D4).
- soft delete: 세트 비활성화는 과거 `Meal` 기록에 영향 없음.

## 4) 검증 결과 (Gate 3)
- **마이그레이션**: `prisma migrate deploy` 적용 완료(dev DB).
- **통합 acceptance** (`src/routes/mealSet.acceptance.test.ts`, 실DB+JWT+http+fetch): **13/13 GREEN**.
  - AC-01, 02, 03, 04(원자성·실패 주입 롤백), 05/15, 06, 07, 08, 11, 12, 13, 17 + 빈 등록 대상 422.
- **전체 서버 테스트**: `npm test` → **136 pass / 0 fail / 0 todo**.
- **앱 정적 검증**: `tsc --noEmit` 통과, IDE 린트 클린.

### 자동화 범위 밖 (앱·수동)
- AC-09(빈 상태), AC-10(토큰 1회 재발급), AC-14(타임아웃→멱등 재시도), AC-16(등록 후 캐시 갱신): 앱 책임. AC-16은 Log 탭 포커스 리로드(`useFocusReload`)로 구현, AC-14는 서버 멱등(AC-07)에 위임 + 앱의 모호 오류 1회 재시도.

## 5) 확인 포인트 (리뷰어/후속)
- apply는 **요청 시점 세트 항목 스냅샷** 기준(편집/비활성화 경합 시 PRD §8b.3 정책).
- 통합 테스트는 dev DB(`localhost:15432`)를 사용하고 `after`에서 생성 데이터를 정리한다. 전용 테스트 DB 분리는 후속 개선 여지.
- 앱 항목 추가는 MVP에서 `PORTION_COUNT`만 신규 입력(기존 `TOTAL_GRAMS` 항목은 표시·등록 정상). 수동 항목은 후순위(PRD §6.2).
- 날짜 선택은 일 단위 스텝퍼(과거/오늘만). 캘린더 피커는 후속 보강 여지.

## 6) 잔여 / 후속 작업
- 앱 실기기 E2E(생성→편집→한 번에 등록→Log/통계 반영) 수동 점검.
- (선택) 통합 테스트 전용 DB 분리, 날짜 캘린더 피커, 수동 항목(§6.2) 지원.
