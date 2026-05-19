# API Contract v1.10 — 통계 6버킷 윈도우 (delta)

## `GET /stats?range=day|week|month&anchor=YYYY-MM-DD`

### Breaking (모바일 `daily[]` 소비)

| range | 이전 | 이후 |
|-------|------|------|
| `day` | 앵커 **1일** 합계, `daily[]` 없음 | **6일** 롤링 윈도우(앵커=마지막 날), `daily[]` **6포인트** |
| `week` | 앵커 주 **7일** 일별 전개 | **6주** 버킷, `daily[].summary` = **기록일 일평균** |
| `month` | 앵커 월 **전체 일** 일별 전개 | **6개월** 버킷, `daily[].summary` = **기록일 일평균** |

### 공통

- `anchor`: 윈도우 **끝** 시점(일=해당일, 주=앵커가 속한 주의 일요일 쪽 앵커일, 월=해당 월 내 임의일).
- `period.from` / `period.toExclusive`: 6버킷 전체 구간(KST).
- `period.label`: 윈도우 요약(예: `5/11 – 5/16`, `4월 1주차 – 5월 2주차`, `2025년 12월 – 2026년 5월`).
- `aggregation: "dailyAverage"`, `periodMeta.calendarDays: 6` — **day/week/month 모두** 적용.
- `summary`, `byMealSlot`: 윈도우 합계 → **기록 있는 KST 일수**(`periodMeta.recordedDays`)로 일평균.
- `periodMeta.recordedDays`: 윈도우 전체 distinct 기록 **일** 수 (버킷 수 아님).

### `daily[]` 항목

| 필드 | 설명 |
|------|------|
| `date` | 버킷 키: `YYYY-MM-DD`(일·주 **일요일**) 또는 `YYYY-MM-01`(월) |
| `label` | 차트 X축용: `5/16`, `5월 2주차`, `5월` 등 |
| `summary` | 일별: 해당일 **합계**. 주별·월별: 버킷 내 **기록일 일평균** (목표 구간과 동일 스케일) |
| `hasRecords` | 버킷에 기록 1건 이상 |
| `calorieStatus` | 버킷 **종료일** 기준 목표 대비 (`WeightEntry` 스냅샷 규칙 v1.8 유지) |
| `goalMet` | 칼로리·단백질 달성 여부 |

### 주차 라벨

- **일요일** 시작(일~토).
- **일요일이 속한 달**에서 N번째 일요일 → `{m}월 {n}주차`.

### 모바일 기간 이동

- `anchor` offset: 이전/다음 윈도우 = **6일 / 6주(42일) / 6월** 단위(클라이언트 `shiftAnchor`).

### 비고

- `range=meal` 변경 없음.
- `goalAchievement`: **일별** 합계 기준 달성률(`countedDays` = 기록 일 수).
