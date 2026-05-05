---
type: contract
project: dietManagement
doc_lane: requirements
version: v1-fixed
updated_at: 2026-05-05
tags: [api, contract, backend, frontend]
---

# 식단 관리 API 계약 상세 v1 (고정)

> Gate 2 기준으로 본 문서는 구현 입력 계약으로 고정한다. 이후 변경은 `v1.x` 증분 기록 + 상태 매핑/QA 동시 갱신을 필수로 한다.

## 1) 공통 규칙
- 인증: Bearer JWT
- 시간: ISO 8601, 타임존 포함
- 페이지네이션 기본: `page`(1-base), `size`(기본 15)
- 비활성화 데이터 기본 제외, `includeInactive=true`일 때만 포함

## 2) 공통 오류 응답
```json
{
  "code": "AUTH_UNAUTHORIZED",
  "message": "인증이 필요합니다.",
  "details": {},
  "traceId": "req-abc123"
}
```

상태코드 최소 기준:
- 400, 401, 402, 403, 404, 409, 422, 429, 500, 503

## 3) 사용자 앱 API

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`

### Profile / Recommendation
- `GET /me/profile`
- `PUT /me/profile`
- `POST /me/recommendation/recalculate`

검증 원칙:
- 나이/신장/체중 허용 범위 벗어나면 `422`

### Meals
- `POST /meals`
- `GET /meals?from=&to=&page=&size=15`
- `PUT /meals/{mealId}`
- `PATCH /meals/{mealId}/deactivate`

검증 원칙:
- 섭취량/영양소 음수 입력 불가 (`422`)
- 비활성화 멱등 보장 (이미 비활성화여도 성공 응답)

### OCR
- `POST /nutrition/ocr`

응답 예시 필드:
- `calories`, `carbohydrate`, `protein`, `fat`
- `confidence` (0~1)
- `missingFields` (배열)
- `remainingFreeQuota` (남은 무료 OCR 횟수)

오류 예시 코드:
- `OCR_RATE_LIMIT`, `OCR_PROVIDER_UNAVAILABLE`, `OCR_PARSE_FAILED`
- `OCR_FREE_QUOTA_EXCEEDED`, `PAYMENT_REQUIRED`

### Stats
- `GET /stats?range=meal|day|week|month`

응답 필수 필드:
- `aggregatedAt`: 마지막 배치 완료 시각
- `isStale`: 지연 여부
- `staleHours`: 지연 시간(시간 단위)
- `timezone`: 집계 기준 타임존
- `summary`: `calories`, `carbohydrate`, `protein`, `fat`

## 4) 관리자 API

### Users
- `GET /admin/users?query=&status=&from=&to=&includeInactive=&page=&size=15`
- `PATCH /admin/users/{id}/deactivate`

정책:
- 비활성 회원 로그인/토큰 재발급 차단

### Foods
- `GET /admin/foods?query=&status=&category=&includeInactive=&page=&size=15`
- `POST /admin/foods`
- `PUT /admin/foods/{id}`
- `PATCH /admin/foods/{id}/deactivate`

정책:
- 템플릿 비활성화 후 신규 기록 선택 불가
- 과거 기록 데이터는 보존

### Inquiries
- `GET /admin/inquiries?query=&status=&from=&to=&includeInactive=&page=&size=15`
- `PATCH /admin/inquiries/{id}/status`
- `PATCH /admin/inquiries/{id}/deactivate`

### Notices
- `GET /admin/notices?query=&status=&from=&to=&includeInactive=&page=&size=15`
- `POST /admin/notices`
- `PUT /admin/notices/{id}`
- `PATCH /admin/notices/{id}/deactivate`

### Dashboard
- `GET /admin/dashboard`
- `POST /admin/stats/reaggregate`

응답 예시 필드:
- `newUsers`, `activeUsers`, `mealRecordCount`, `inquiryCount`

KPI 계산 기준:
- `newUsers`: 조회 기간 내 가입 완료 사용자 수(중복 제외)
- `activeUsers`: 조회 기간 내 식사 기록 1회 이상 생성한 고유 사용자 수
- `mealRecordCount`: 조회 기간 내 생성된 식사 기록 총 건수
- `inquiryCount`: 조회 기간 내 생성된 문의 총 건수(비활성 제외 기본값)

## 5) 과금/광고 API

### Billing
- `GET /me/billing/entitlements`
- `POST /me/billing/checkout`
- `POST /me/billing/restore`

MVP 상품 정책:
- `productType`: `premium_monthly` 단일 SKU
- `POST /me/billing/checkout` 요청 필드: `productType` (`premium_monthly`)
- 기준 가격(초안): `premium_monthly` 월 4,900원

권장 응답 필드:
- `ocrQuotaLimit` (기본 5)
- `ocrQuotaUsed`
- `ocrPaidEnabled` (boolean)
- `adFreeEnabled` (boolean)
- `nextPaywallTrigger` (`none` | `ocr_remaining_1` | `ocr_exhausted`)

### Ads
- `GET /me/ads/status`

응답 필드:
- `showBottomBanner` (boolean)
- `reason` (`default_free` | `ad_free_purchased`)

## 6) 배치/보존 계약
- soft delete 적용 대상: 회원/음식 템플릿/식사 기록/문의/공지
- hard delete 기준: `deactivatedAt + 1년`
- purge 배치 실패 시 재시도 큐에 적재, `traceId`로 추적
- 감사/운영 로그 보존기간: 5년

## 7) 표준 에러 코드 카탈로그
- 인증/권한: `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`, `AUTH_TOKEN_EXPIRED`
- 검증/충돌: `VALIDATION_FAILED`, `RESOURCE_CONFLICT`
- OCR: `OCR_RATE_LIMIT`, `OCR_PROVIDER_UNAVAILABLE`, `OCR_PARSE_FAILED`
- 과금: `PAYMENT_REQUIRED`, `OCR_FREE_QUOTA_EXCEEDED`, `BILLING_NOT_AVAILABLE`
- 통계: `STATS_STALE_DATA`
- 공통: `INTERNAL_SERVER_ERROR`, `DEPENDENCY_UNAVAILABLE`

## 8) 변경 관리
- 본 문서는 PRD 승인 버전에 종속된다.
- API 스키마 변경 시 PRD + 상태 매핑 + QA 시나리오 동시 갱신이 필수다.
- Gate 2 구현 중 계약 변경이 발생하면 `docs/design/diet-management-alignment-notes.md`와 구현 분할 계획 문서를 즉시 재동기화한다.
