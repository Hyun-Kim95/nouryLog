---
type: doc
project: dietManagement
doc_lane: qa
updated_at: 2026-05-06
tags: [gate-i2, c3, integration, contract]
---

# Gate-I2 · Common-C3 통합 점검 (계약 1:1)

SSOT: `docs/requirements/feature-diet-management-implementation-split-plan-v1.md` §5.4 Gate-I2.

## 목적

`Common-C3`에서 **엔드포인트별 request / response / error** 가 다음을 만족하는지 확인한다.

- OpenAPI 스냅샷: `contracts/openapi-diet-management-v1.yaml`
- 오류 코드 카탈로그: `contracts/error-catalog.json`, TS 상수: `contracts/errorCodes.ts`
- 백엔드 구현: `apps/server` + Prisma (`DATABASE_URL`, 시드 계정)
- 관리자 웹: `apps/admin-web` → Vite 프록시 `/api` → 서버
- 모바일: `apps/mobile/src/api.ts` 등 (`EXPO_PUBLIC_API_URL`)
- 목업·MSW(선택): `mock-internal/src/mocks/handlers.ts`
- 공유 타입/래퍼: `packages/api-client` (`createDietApiClient`, `openapi-typescript` 생성물)

## 사전 조건

- [ ] `apps/server` 기동 또는 배포 API 베이스 URL 확정
- [ ] 프론트 API 클라이언트 베이스 URL·인증 헤더 규약 확정 (Integration Owner)
- [ ] `mock-internal`에서 MSW 사용 시 `.env.development`의 `VITE_USE_MSW` 확인

## 엔드포인트 매핑 표 (Gate-I2)

| Method | Path | 계약/OpenAPI | FE 클라이언트 함수/모듈 (기입) | 비고 |
|--------|------|----------------|-------------------------------|------|
| POST | /auth/signup | ✅ | (관리자 웹 미사용) · 모바일 확장 시 동일 `fetch` 패턴 | |
| POST | /auth/login | ✅ | `apps/admin-web/src/auth.tsx` · `apps/mobile/src/api.ts` `loginRequest` | |
| POST | /auth/refresh | ✅ | (클라이언트 미연동 — 후속 SecureStore+refresh) | |
| GET | /me/profile | ✅ | (모바일 후속 화면) | Bearer |
| PUT | /me/profile | ✅ | (모바일 후속 화면) | Bearer |
| POST | /me/recommendation/recalculate | ✅ | (모바일 후속 화면) | Bearer |
| POST | /meals | ✅ | `apps/mobile/src/screens/LogScreen.tsx` `addMeal` | Bearer |
| GET | /meals | ✅ | `LogScreen` `load` | 페이지네이션 query |
| PUT | /meals/:mealId | ✅ | (후속) | |
| PATCH | /meals/:mealId/deactivate | ✅ | (후속) | |
| POST | /nutrition/ocr | ✅ | `LogScreen` `runOcr` | |
| GET | /stats | ✅ | `apps/mobile/src/screens/StatsScreen.tsx` | `range` 필수 |
| GET | /me/billing/entitlements | ✅ | `apps/mobile/src/screens/HomeScreen.tsx` | |
| POST | /me/billing/checkout | ✅ | `apps/mobile/src/screens/SubscriptionScreen.tsx` | body `productType` |
| POST | /me/billing/restore | ✅ | `SubscriptionScreen` `restore` | |
| GET | /me/ads/status | ✅ | `HomeScreen` | |
| GET | /admin/dashboard | ✅ | `apps/admin-web/src/pages/DashboardPage.tsx` | 관리자 Bearer |
| POST | /admin/stats/reaggregate | ✅ | `DashboardPage` `reaggregate` | 202 |
| GET | /admin/users | ✅ | `apps/admin-web/src/pages/EntityListPage.tsx` (`members`) | page/size 기본 15 |
| PATCH | /admin/users/:id/deactivate | ✅ | (후속 액션 컬럼) | |
| GET | /admin/foods | ✅ | `EntityListPage` (`foods`) | |
| POST | /admin/foods | ✅ | (후속) | |
| PUT | /admin/foods/:id | ✅ | (후속) | |
| PATCH | /admin/foods/:id/deactivate | ✅ | (후속) | |
| GET | /admin/inquiries | ✅ | `EntityListPage` (`inquiries`) | |
| PATCH | /admin/inquiries/:id/status | ✅ | (후속) | |
| PATCH | /admin/inquiries/:id/deactivate | ✅ | (후속) | |
| GET | /admin/notices | ✅ | `EntityListPage` (`notices`) | |
| POST | /admin/notices | ✅ | (후속) | |
| PUT | /admin/notices/:id | ✅ | (후속) | |
| PATCH | /admin/notices/:id/deactivate | ✅ | (후속) | |

## 오류 응답 (공통 포맷)

- [ ] 본문 필드: `code`, `message`, `details`, `traceId` — 계약 및 `ErrorResponse` 스키마와 일치
- [ ] 주요 HTTP 상태: 401 `AUTH_*`, 403 관리자, 422 `VALIDATION_FAILED` 등 — `error-catalog.json` 힌트와 일치
- [ ] 프론트: `feature-diet-management-state-mapping.md` 의 코드별 UX(재시도·이동) 반영 여부

## 실연동 스모크 (C3 완료 신호)

- [ ] 앱 플로우: OCR → 기록 → 통계(stale 필드) → billing → ads 게이트 (최소 1회)
- [ ] 관리자: 대시보드 → 재집계 → 목록 4종 필터·페이지네이션·403 분리
- [ ] `x-trace-id` 또는 동등 추적 헤더가 클라이언트 로그에 노출 가능한지

## 결과 기록

- 통합 일시:
- 담당 (Integration Owner):
- 차이 목록 (있을 경우):
- 후속 조치 (계약 개정 vs 구현 수정):
