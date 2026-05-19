# API Contract v1.9 — 체중 이력·참고 체중 (delta)

## `GET /me/weight-entries`

- 인증: USER
- Query:
  - `page` (기본 1, ≥1)
  - `size` (기본 30, 1~100)
  - `from`, `to` (선택, ISO 8601 — `recordedAt` 필터)
- 응답 200:
```json
{
  "items": [{ "id": "…", "recordedAt": "2026-05-19T12:00:00.000Z", "weightKg": 72.5 }],
  "page": 1,
  "size": 30,
  "total": 5
}
```
- 정렬: `recordedAt` desc

## `GET /me/reference-weight`

- 인증: USER
- 전제: `Profile` 존재, `heightCm` 유효(100~250)
- Query(선택, 온보딩 미리보기): `heightCm`, `age`, `weightKg` — 있으면 프로필 값 대신 사용
- 응답 200:
```json
{
  "bmiMin": 18.5,
  "bmiMax": 23,
  "weightKgMin": 56.7,
  "weightKgMax": 70.6,
  "currentWeightKg": 78,
  "currentBmi": 25.4,
  "suggestedGoal": "lose",
  "disclaimer": "참고·추정 값입니다. …",
  "warnings": ["teen_caution"]
}
```
- `suggestedGoal`: `lose` | `maintain` | `gain` | `null` (체중 없으면 null)
- `warnings`: `teen_caution` | `older_adult_caution` (0~n)
- 404: 프로필 없음
- 422: 신장 미설정/범위 밖

## 기존 (변경 없음)

- `GET /me/weight-entries/status`
- `POST /me/weight-entries`
