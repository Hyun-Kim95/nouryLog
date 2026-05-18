# API Contract v1.7 — 모바일 문의·공지·통계 확장 (delta)

## 문의 (인증 필요)

### `GET /me/inquiries?page=&size=15`

- 본인 `userId` + `active: true`만.
- 응답: `{ page, size, total, items: [{ id, subject, status, answered, createdAt }] }`

### `GET /me/inquiries/{id}`

- 본인 문의만. 404 if missing.
- 응답: `{ id, subject, body, status, answer, answeredAt, createdAt }`

### `POST /me/inquiries`

- Body: `{ subject, body }` (subject ≤200, body ≤4000)
- 201: 상세와 동일 shape. `status: pending`

## 공지 (비인증)

### `GET /public/notices?page=&size=15`

- `active: true` + 게시 기간(`publishStart`/`publishEnd`) 내 공지만.
- 정렬: `pinned desc`, `createdAt desc`

### `GET /public/notices/{id}`

- 게시 중 공지만. 본문 포함.

## 통계 `GET /stats` (week | month)

### Breaking (모바일 전용 소비)

- `summary`, `byMealSlot`: 기간 **합계** → **기록 있는 날 일평균** (`recordedDays` 분모).
- 추가 필드:
  - `aggregation: "dailyAverage"`
  - `periodMeta: { recordedDays, calendarDays }`
  - `daily[].calorieStatus`: `"none" | "under" | "met" | "over"` (`computeFulfillment`와 동일)

### day range

- 기존과 동일(합계, `aggregation`/`periodMeta` 없음).

`goalAchievement`는 유지(모바일 UI에서 미노출).

## 식사 목록 `GET /meals`

### 쿼리 (추가)

- `excludeFoodTemplate=true` | `1` (선택): `foodTemplateId`가 있는(템플릿으로 기록한) 식사를 제외. 모바일「최근 먹은 음식」전용.
