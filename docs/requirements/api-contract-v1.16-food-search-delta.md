---
type: api-contract
project: dietManagement
status: fixed
parent: docs/requirements/feature-mobile-food-search-history-prd.md
updated_at: 2026-06-23
version: v1.16
tags: [requirements, api-contract, food-search, meals]
---

# API 계약 v1.16 — 음식 검색·섭취 이력 (Gate 2 고정)

PRD: [`feature-mobile-food-search-history-prd.md`](./feature-mobile-food-search-history-prd.md)

기존 `GET /me/meals`를 확장하고, 검색 요약용 신규 엔드포인트 1개를 추가한다. 모두 일반 사용자(`role=USER`) 인증 필요, 응답은 본인(`userId`) 데이터로 스코프.

> 실제 HTTP 경로: `meRouter`가 루트에 마운트되어 클라이언트는 `GET /meals`, `GET /meals/search-summary`로 호출한다(문서 표기 `/me/...`는 논리적 스코프 의미). `apps/mobile`의 `API_BASE` 기준 상대 경로.

## 1) 변경: `GET /me/meals`

### 신규 쿼리 파라미터
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | 선택 | 음식명 부분 일치. `name contains q.trim()`, 대소문자 무시. 빈 문자열/공백은 미적용 |

- 기존 파라미터(`page`, `size`, `from`, `to`, `mealSlot`, `excludeFoodTemplate`)와 조합 가능.
- 응답 스키마 **변경 없음**. `items`는 `consumedAt` 역순, `total`은 필터 적용 후 전체 건수(= 기간 내 빈도).
- 후방 호환: `q` 미전달 시 기존 동작과 동일.

## 2) 신규: `GET /me/meals/search-summary`

검색어 1건에 대한 **빈도 + 마지막 섭취 + 끼니 분포**를 한 번에 반환한다(리스트는 `GET /me/meals`로 별도 페이지네이션).

### 요청
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | 선택 | 음식명 부분 일치(위와 동일 규칙). 빈 값이면 total 0 · bySlot 전부 0 |
| `from` | ISO datetime | 선택 | `consumedAt >= from` |
| `to` | ISO datetime | 선택 | `consumedAt <= to` |

### 응답 200
```json
{
  "q": "라면",
  "total": 12,
  "lastConsumedAt": "2026-06-20T03:00:00.000Z",
  "bySlot": {
    "BREAKFAST": 2,
    "LUNCH": 3,
    "DINNER": 3,
    "SNACK": 4,
    "UNSPECIFIED": 0
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `q` | string | 정규화된(trim) 검색어. 빈 값이면 `""` |
| `total` | number | 활성 식사 매칭 건수(기간 내). 빈도 표시 기준 |
| `lastConsumedAt` | string \| null | 매칭 식사 중 가장 최근 `consumedAt`(ISO). 없으면 null |
| `bySlot` | object | 끼니별 건수. 키: `BREAKFAST/LUNCH/DINNER/SNACK/UNSPECIFIED`(=mealSlot null). 항상 5키 포함 |

### 오류
- 401 `AUTH_*` (미인증/만료) — 기존 인증 미들웨어.
- 403 `AUTH_FORBIDDEN` — `role !== USER`.
- 422 `VALIDATION_FAILED` — `from`/`to` 날짜 파싱 실패(`field`).

## 3) 상태 코드/오류 포맷
- 기존 `sendError(res, status, ErrorCodes.*, message, { field })` 포맷 동일.

## 4) AC 매핑
- AC-01 `GET /me/meals?q=` 이름 필터·역순·total → §1
- AC-02 trim·insensitive → §1, §2
- AC-03 기간 필터 빈도 → §1 total, §2 total
- AC-09 끼니 분포 → §2 bySlot

## 5) 비고
- 마이그레이션 0, 스키마 변경 0. `@@index([userId, consumedAt])` 활용.
