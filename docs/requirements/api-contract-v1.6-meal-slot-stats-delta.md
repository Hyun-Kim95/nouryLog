# API v1.6 delta — 끼니·간식 위치·통계 확장

## Meals

### `snackPlacement` (optional enum)

- `BEFORE_BREAKFAST` | `BETWEEN_BREAKFAST_LUNCH` | `BETWEEN_LUNCH_DINNER` | `AFTER_DINNER`
- `POST /meals`, `PUT /meals/{mealId}`: `mealSlot === SNACK`이면 **필수**. 그 외 끼니는 `null`만 허용.
- `GET /meals` 항목에 `snackPlacement` 포함.

## Stats `GET /stats`

기존 `summary` 유지. 추가 필드:

- `byMealSlot`: `{ [BREAKFAST|LUNCH|DINNER|SNACK|UNSPECIFIED]: NutritionSum }` — day/week/month 공통
- `daily` (week/month): KST 일별 `{ date, summary, goalMet: { calorie, protein }, hasRecords }`
- `goalAchievement` (week/month): 칼로리·단백질 **각각** `{ metDays, countedDays, pct }`
  - `countedDays`: 해당 기간 중 기록이 1건 이상인 날 수
  - `metDays`: `goalFulfillment`와 동일 규칙으로 `status === met`인 날 수

## 온보딩 (클라이언트)

- SecureStore `dm_onboarding_done_{userId}` (`:` 불가, SecureStore 키 규칙) — 로그아웃 시 토큰만 삭제, 계정별 완료 플래그 유지
- `calorieGoalKcal` 또는 `proteinGoalG` 존재 시 온보딩 자동 스킵
