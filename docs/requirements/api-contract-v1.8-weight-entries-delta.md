# API Contract v1.8 — 주간 체중 기록 (delta)

## `GET /me/weight-entries/status`

- 인증: USER
- 응답:
  - `due: boolean` — 마지막 기록 없음 또는 **7일 이상** 경과
  - `lastRecordedAt: string | null` (ISO)
  - `lastWeightKg: number | null`
  - `daysSince: number | null`

## `POST /me/weight-entries`

- Body: `{ weightKg: number }` (20~300, 소수 1자리)
- 동작: `Profile.weightKg` 갱신 → 권장 목표 재계산(`recommendation/recalculate` 동일) → `WeightEntry`에 목표 스냅샷 저장
- 201 응답:
  - `entry: { id, recordedAt, weightKg }`
  - `goalsBefore`, `goalsAfter` — 칼로리·단백질 목표(min/max 포함) 스냅샷

## 통계 영향

- `GET /stats` week|month `daily[].calorieStatus` — 해당 일자에 유효한 **가장 최근 WeightEntry** 목표 사용. 스냅샷 없는 과거 일자는 현재 Profile 목표 폴백.
- `Meal` 데이터는 변경하지 않음.

## 범위 외 (1차)

- 프로필 수정 화면에서 체중만 변경 시 `WeightEntry` 자동 생성 없음(주간 모달 POST만).
