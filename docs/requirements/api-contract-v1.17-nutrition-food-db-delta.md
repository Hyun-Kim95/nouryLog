---
type: api-contract
project: dietManagement
status: fixed
parent: docs/requirements/feature-nutrition-food-db-prd.md
updated_at: 2026-07-19
version: v1.17
tags: [requirements, api-contract, nutrition-food, mfds]
---

# API 계약 v1.17 — 공개 영양 식품 DB (NutritionFood)

PRD: [`feature-nutrition-food-db-prd.md`](./feature-nutrition-food-db-prd.md) (v0.4)

신규 카탈로그 테이블 `NutritionFood`와 검색 API만 추가한다.  
기존 `FoodTemplate` / `Meal` / `MealSet` / Foods admin CRUD / OCR / Billing **변경 없음**.

> **HTTP 경로:** `GET /me/nutrition-foods`, `GET /admin/nutrition-foods`  
> (`food-templates`와 같이 `/me`·`/admin` 접두 포함. meals의 `/meals` 단축과 **다름** — `/nutrition-foods` 단독 경로 없음.)

## 0) 정책 정합

| 항목 | 결정 |
|---|---|
| 과금 | OCR·프리미엄과 **무관**. 호출 한도 없음(1차) |
| 쿼리 키 | `q` (v1.16과 동일). `food-templates`의 `query`와 이름만 상이 |
| 페이지 | 기본 size **15**, 상한 **100**, **clamp**(422 아님) |
| 환산 | 반올림 없음 — `computeScaledNutritionFromGrams`와 동일 |

## 1) 스키마 (Prisma 요약)

```
NutritionFood
  id String @id @default(cuid())
  source String          // 1차 "MFDS"
  externalId String      // 1..64
  name String            // 1..120
  nameNormalized String
  category String?       // ≤50 (import truncate)
  per100gCalories Float
  per100gProtein Float
  per100gFat Float
  per100gCarbohydrate Float
  defaultServingGrams Float?
  sourceVersion String
  importedAt DateTime
  createdAt DateTime @default(now())
  active Boolean @default(true)
  deactivatedAt DateTime?
  rawPayload Json?
  @@unique([source, externalId])
  @@index([active, nameNormalized])
```

- 검색: `(name contains q) OR (nameNormalized contains normalize(q))`, `mode: 'insensitive'` 가능 시 적용.
- 매크로: 비음수·유한수, null 불허.

## 2) 신규: `GET /me/nutrition-foods`

인증: `role=USER`. **active만**.

### 쿼리

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | 선택 | trim 후 사용. 생략/공백 → 전체 active. 길이 **>60 → 422** |
| `page` | int | 선택 | clamp ≥1; 비숫자 → 1 |
| `size` | int | 선택 | clamp 1..100; 비숫자 → 15 |

`includeInactive` 전달 시 **무시**.

### 응답 200

```json
{
  "items": [
    {
      "id": "cuid",
      "source": "MFDS",
      "externalId": "D000001",
      "name": "닭가슴살 구운것",
      "category": "육류",
      "per100g": {
        "calories": 165,
        "protein": 31,
        "fat": 3.6,
        "carbohydrate": 0
      },
      "defaultServingGrams": 100
    }
  ],
  "page": 1,
  "size": 15,
  "total": 1
}
```

| 필드 | 설명 |
|---|---|
| `category` | 없으면 **`null`** |
| `defaultServingGrams` | 없으면 **`null`** (클라는 100 가정) |
| `total` | 필터 전체 건수 |
| `page`/`size` | clamp **후** 값 |

정렬: `name` asc, 동명 시 `id` asc.

### 2.1 오류·엣지 (USER)

| HTTP | code | 조건 | details |
|---|---|---|---|
| 401 | `AUTH_*` | 미인증·만료 | — |
| 403 | `AUTH_FORBIDDEN` | `role !== USER` (ADMIN 포함) | — |
| 422 | `VALIDATION_FAILED` | trim 후 `q.length > 60` | `{ "field": "q" }` |
| 500 | `INTERNAL_SERVER_ERROR` | 미처리 | `wrap()` |

**200 (에러 아님):** 카탈로그 0·무매칭·빈 q 목록·페이지 초과 빈 items·page/size clamp.

## 3) 신규: `GET /admin/nutrition-foods`

인증: `role=ADMIN`.

쿼리: `/me`와 동일 + `includeInactive` (`true`/`1`만 true).

응답 항목 **필수 추가:** `active`, `sourceVersion`, `importedAt`, `deactivatedAt` (`null` 허용).  
`rawPayload`는 응답 **미포함**.

### 3.1 오류 (ADMIN)

401 / 403(non-ADMIN) / 422(`q`>60).

## 4) import (비HTTP)

- CLI: `npm run nutrition:import -- --file=... --sourceVersion=YYYY-MM` (`sourceVersion` **필수**)
- upsert `(source, externalId)`; 고아 자동 비활성 **없음**
- 청크 **100행** 커밋; 실패 시 이전 청크 유지 + exit ≠ 0
- 행 skip·exit: PRD §5.1
- raw: `apps/server/data/nutrition-food/raw/` (gitignore)

### 4.1 upsert 시 `active`

- insert: `active=true`, `deactivatedAt=null`
- update: 매크로·이름 갱신. 파일에 `active` 없으면 **기존 active 유지**. `active=false`로 둘 때 `deactivatedAt=now()`(파일에 명시된 경우)

## 5) 환산 헬퍼

```
scale = grams / 100
out = per100g * scale  // 반올림 없음
```

| 입력 | 동작 |
|---|---|
| `grams` 유한 & `> 0` | 정상 |
| 그 외 | throw `INVALID_GRAMS` |
| `per100g*` 비유한수 | throw `INVALID_NUTRITION` |

Meal `1..5000` 상한은 후속 기록 API. 헬퍼는 상한 clamp 안 함.

## 6) AC 매핑

| AC | 계약 |
|---|---|
| AC-01 | §4 (upsert ≠ 전역 active 건수) |
| AC-02 | §2 `per100g` 객체 |
| AC-03·12 | §5 |
| AC-04 | 회귀 |
| AC-05 | §2.1·§3.1 (+ ADMIN→`/me` 403) |
| AC-06·07 | §2.1 |
| AC-08 | §2.1 q 422 |
| AC-09 | §2.1 clamp |
| AC-10 | inactive |
| AC-11 | §4·PRD §5.1 |
| AC-13 | 경로 `/me/nutrition-foods` |

## 7) 비고

- 공통 envelope: 모체 §2
- 상태 매핑: [`feature-diet-management-state-mapping.md`](./feature-diet-management-state-mapping.md) §6
- 출처: [`docs/agent/nutrition-food-db-source.md`](../agent/nutrition-food-db-source.md)
