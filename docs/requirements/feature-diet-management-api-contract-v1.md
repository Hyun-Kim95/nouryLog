---
type: contract
project: dietManagement
doc_lane: requirements
version: v1.3
updated_at: 2026-05-09
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
- `POST /auth/social/{provider}/start` (`provider`: `naver|google|kakao`)
- `GET /auth/social/{provider}/callback`
- `POST /auth/social/conflict/resolve`

소셜 로그인 계약:
- `POST /auth/social/{provider}/start`
  - 요청: `{ "redirectUri": "myapp://oauth" }`
  - 응답: `{ "authorizationUrl": "https://..." }`
- `GET /auth/social/{provider}/callback`
  - 서버가 provider 인증 완료 후 앱 딥링크로 리다이렉트한다.
  - 성공: `...?result=success&accessToken=...&refreshToken=...`
  - 충돌: `...?result=conflict&conflictToken=...`
  - 실패: `...?result=error&message=...`
- `POST /auth/social/conflict/resolve`
  - 요청: `{ "conflictToken": "...", "action": "link" | "separate" }`
  - 응답: `{ "accessToken": "...", "refreshToken": "..." }`

### Profile / Recommendation
- `GET /me/profile`
- `PUT /me/profile` — body: `{ gender?, age?, heightCm?, weightKg?, activityLevel?, goal?, proteinGoalG?, calorieGoalKcal? }` (필드 단위 부분 갱신)
- `POST /me/recommendation/recalculate`

응답 필드(`GET /me/profile`):
- `gender`(`male`|`female`|`unspecified`), `age`, `heightCm`, `weightKg`
- `activityLevel`(nullable, `sedentary`|`light`|`moderate`|`active`)
- `goal`(nullable, `lose`|`maintain`|`gain`)
- `proteinGoalG`(optional), `calorieGoalKcal`(optional)

`PUT /me/profile` 본문 의미론(v1.3):
- 키 자체를 보내지 않음(JSON undefined) = **변경 없음**.
- `gender`/`age`/`heightCm`/`weightKg`/`proteinGoalG`/`calorieGoalKcal`: 위 검증 통과 값만 허용. `null`은 허용하지 않으며 422를 반환한다(스키마 NOT NULL).
- `activityLevel`/`goal`: 위 enum 값 또는 `null`을 허용한다. **`null`은 명시적 clear 신호**로 해석되어 DB에 NULL이 저장된다.

검증 원칙(v1.2 강화 + v1.3 추가):
- `gender`: `male` / `female` / `unspecified` 중 하나. 그 외는 422 + `details = { field: 'gender', allowed: [...] }`.
- `activityLevel`: `sedentary` / `light` / `moderate` / `active` 또는 `null`. 그 외는 422 + `details = { field: 'activityLevel', allowed: [...] }`.
- `goal`: `lose` / `maintain` / `gain` 또는 `null`. 그 외는 422 + `details = { field: 'goal', allowed: [...] }`.
- `age`: 정수 13~99. 그 외는 422 + `details = { field: 'age', allowedMin: 13, allowedMax: 99 }`.
- `heightCm`: 정수 100~250. 그 외는 422 + `details = { field: 'heightCm', allowedMin: 100, allowedMax: 250 }`.
- `weightKg`: 정수 20~300. 그 외는 422 + `details = { field: 'weightKg', allowedMin: 20, allowedMax: 300 }`.
- `proteinGoalG`/`calorieGoalKcal`: 정수 0~10000. 위반 시 동일 패턴.
- 모든 422 응답은 `code: VALIDATION_FAILED`로 통일하고 `details.field`로 클라이언트가 인라인 매핑할 수 있게 한다.

권장 계산 로직(`POST /me/recommendation/recalculate`, v1.3):
- BMR(미플린-세인트 지오어): male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161`, unspecified `10w + 6.25h − 5a − 78`.
- TDEE = BMR × 활동 계수(`sedentary` 1.2 / `light` 1.375 / `moderate` 1.55 / `active` 1.725).
- 칼로리 목표 = round(TDEE × 목표 가감(`lose` 0.9 / `maintain` 1.0 / `gain` 1.1)).
- 단백질 목표 = round(weightKg × goal별 g/kg(`lose` 1.4 / `maintain` 1.0 / `gain` 1.6)).
- `activityLevel`/`goal`이 NULL이면 안전 기본값 `moderate`/`maintain`을 사용해 계산한다.
- `PUT /me/profile`은 권장량을 자동 갱신하지 않는다. 클라이언트가 저장 직후 본 엔드포인트를 명시 호출한다.

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
- `GET /admin/foods/{id}`
- `POST /admin/foods` — body: `{ name, memo?, category? }`
- `PUT /admin/foods/{id}` — body: `{ name?, memo?, category? }` (필드 단위 부분 갱신)
- `PATCH /admin/foods/{id}/deactivate`
- `PATCH /admin/foods/{id}/activate`

응답(목록·상세 공통) 필드:
- `id`, `name`, `memo`, `category`(nullable), `status`(`active`|`inactive`), `createdAt`

정책:
- 템플릿 비활성화 후 신규 기록 선택 불가
- 과거 기록 데이터는 보존
- `category`는 자유 문자열, 길이 1~50자(빈 문자열은 `null`로 취급)

### Inquiries
- `GET /admin/inquiries?query=&status=&from=&to=&includeInactive=&page=&size=15`
- `GET /admin/inquiries/{id}` — 상세(답변 본문 포함)
- `PATCH /admin/inquiries/{id}/status` — body: `{ status: 'pending' | 'in_progress' | 'done' }`
- `PATCH /admin/inquiries/{id}/answer` — body: `{ answer: string, transitionToDone?: boolean }`
- `PATCH /admin/inquiries/{id}/deactivate`

목록 응답 필드:
- `id`, `subject`, `status`, `active`, `answered`(boolean), `createdAt`

상세 응답 필드:
- `id`, `userId`(nullable), `subject`, `body`, `status`, `active`, `answer`(nullable), `answeredAt`(nullable, ISO), `answeredBy`(nullable, admin user id), `createdAt`

정책:
- `status` 허용값: `pending`(접수) / `in_progress`(처리중) / `done`(완료) — 그 외는 422.
- `answer` 길이 1~4000자.
- `transitionToDone=true`이면 답변 등록과 동시에 `status='done'`으로 전이한다.
- `from`/`to`는 ISO 8601 날짜·일시이며 `from <= to`. 위반 시 422.

### Notices
- `GET /admin/notices?query=&status=&from=&to=&includeInactive=&page=&size=15`
- `GET /admin/notices/{id}` — 상세(본문 포함)
- `POST /admin/notices` — body: `{ title, body }`
- `PUT /admin/notices/{id}` — body: `{ title?, body? }` (활성 토글은 별도 PATCH로 분리)
- `PATCH /admin/notices/{id}/deactivate`
- `PATCH /admin/notices/{id}/activate`

목록 응답 필드:
- `id`, `title`, `active`, `createdAt`

상세 응답 필드:
- `id`, `title`, `body`, `active`, `createdAt`

정책:
- `from`/`to`는 ISO 8601, `from <= to`. 위반 시 422.

### Dashboard
- `GET /admin/dashboard?periodDays=7` (기본 7, 1~90 클램프)
- `POST /admin/stats/reaggregate`

대시보드 응답 필드:
- `period`: `{ from(ISO), to(ISO), days }`
- `timezone`: `Asia/Seoul`
- `aggregatedAt`(nullable, ISO): 마지막 배치 완료 시각(`StatsBatch.lastRunAt`)
- `isStale`(boolean): `aggregatedAt`이 6시간 이상 경과했거나 `null`이면 true
- `staleHours`(nullable, number): 현재까지의 지연 시간(시간, 소수 1자리)
- `newUsers`, `activeUsers`, `mealRecordCount`, `inquiryCount`

재집계 응답 필드:
- `accepted: true`, `aggregatedAt`(ISO) — 본 MVP에서는 `StatsBatch.lastRunAt`을 즉시 갱신해 후속 집계 작업의 기준 시각으로 사용한다.

KPI 계산 기준:
- `newUsers`: `period` 내 USER 역할 가입자 수.
- `activeUsers`: `period` 내 활성 식사 기록(`Meal.consumedAt` 기준)이 1건 이상 있는 고유 사용자 수.
- `mealRecordCount`: `period` 내 활성 식사 기록 총 건수(`Meal.consumedAt` 기준).
- `inquiryCount`: 현재 시점 기준 미처리(`status !== 'done'`, `active`) 문의 적체 수(기간 무관, 운영 큐 의미).

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
- SNS 인증: `OAUTH_PROVIDER_ERROR`, `OAUTH_CANCELLED`, `ACCOUNT_CONFLICT`, `SOCIAL_STATE_INVALID`
- OCR: `OCR_RATE_LIMIT`, `OCR_PROVIDER_UNAVAILABLE`, `OCR_PARSE_FAILED`
- 과금: `PAYMENT_REQUIRED`, `OCR_FREE_QUOTA_EXCEEDED`, `BILLING_NOT_AVAILABLE`
- 통계: `STATS_STALE_DATA`
- 공통: `INTERNAL_SERVER_ERROR`, `DEPENDENCY_UNAVAILABLE`

## 8) 변경 관리
- 본 문서는 PRD 승인 버전에 종속된다.
- API 스키마 변경 시 PRD + 상태 매핑 + QA 시나리오 동시 갱신이 필수다.
- Gate 2 구현 중 계약 변경이 발생하면 `docs/design/diet-management-alignment-notes.md`와 구현 분할 계획 문서를 즉시 재동기화한다.

### v1.3 (2026-05-09)
모바일 프로필 확장(활동량·목표) 트랙(`docs/requirements/feature-mobile-profile-extra-prd.md`) 정합을 위한 사용자 앱 API 보강. `apps/server/src/routes/me.ts`, `apps/server/src/lib/recommendation.ts`, Prisma `Profile` 스키마 변경.

- `Profile.activityLevel`(nullable) / `Profile.goal`(nullable) 컬럼 추가. 마이그레이션은 `prisma db push`로 적용. 기존 row에 영향 없음(NULL 유지).
- `GET /me/profile` 응답에 `activityLevel`/`goal` 추가(둘 다 nullable).
- `PUT /me/profile` 본문에 `activityLevel?`/`goal?` 허용. enum 검증 강화(`details.field` + `allowed`). `null` 명시 → 명시적 clear 의미론(NULL set).
- `POST /me/recommendation/recalculate` 내부 식 교체: BMR(미플린-세인트 지오어) × 활동 계수 × 목표 가감. 단백질은 체중 × goal별 g/kg. NULL 시 안전 기본값 `moderate`/`maintain`.
- 검증: dev 환경(`scripts/stitch/out/profile-v13.mjs`) 9 케이스 통과(정상/422 enum 4종/null clear/안전 기본값 동치).

### v1.2 (2026-05-09)
모바일 APP_ONBOARD 화면(`docs/requirements/feature-mobile-onboarding-prd.md`) 정합을 위한 사용자 앱 API 검증 강화. `apps/server/src/routes/me.ts` 변경.

- `PUT /me/profile`: `gender`/`age`/`heightCm`/`weightKg`/`proteinGoalG`/`calorieGoalKcal` 모든 필드에 422 응답 표준화. `details`에 `field`(필드명), 정수 범위는 `allowedMin`/`allowedMax`, enum은 `allowed` 배열을 함께 반환.
- 검증 범위(MVP):
  - `gender ∈ {male, female, unspecified}`
  - `age` 13~99 정수
  - `heightCm` 100~250 정수
  - `weightKg` 20~300 정수
  - `proteinGoalG`·`calorieGoalKcal` 0~10000 정수
- Profile 응답 필드 명시(이전엔 §3에서 일부만 언급): `gender`, `age`, `heightCm`, `weightKg`, `proteinGoalG?`, `calorieGoalKcal?`.

### v1.1 (2026-05-09)
Stitch 신규 4화면(ADM_FOODS / ADM_INQUIRIES / ADM_NOTICES / 대시보드) 정합을 위한 admin API 보강. `apps/server/src/routes/admin.ts` 및 Prisma 스키마 변경 사항 반영.

- Foods: `category` 쿼리·필드 추가, `GET /admin/foods/{id}` 신규, `PATCH /admin/foods/{id}/activate` 신규.
- Inquiries: `from`/`to` 쿼리 추가, `status` enum 강제(`pending` / `in_progress` / `done`), `GET /admin/inquiries/{id}` 신규(답변 본문 포함), `PATCH /admin/inquiries/{id}/answer` 신규(`transitionToDone?` 옵션). DB 스키마에 `answer`, `answeredAt`, `answeredBy` 추가.
- Notices: `from`/`to` 쿼리 추가, `GET /admin/notices/{id}` 신규, `PATCH /admin/notices/{id}/activate` 신규(`PUT`은 단일 책임으로 `title`/`body`만 유지).
- Dashboard: `periodDays` 쿼리(기본 7, 최대 90), 응답에 `period`/`timezone`/`aggregatedAt`/`isStale`/`staleHours` 추가. `activeUsers` 정의를 "기간 내 식사 기록이 있는 고유 사용자"로 명시.
- Reaggregate: 응답에 `aggregatedAt`(=`StatsBatch.lastRunAt`) 포함.
- 입력 검증 강화: ISO 날짜·`from <= to`·`category` ≤ 50자·`answer` ≤ 4000자·`status` enum.
