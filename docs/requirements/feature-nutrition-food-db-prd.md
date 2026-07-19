---
type: prd
project: dietManagement
status: approved
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/requirements/api-contract-v1.17-nutrition-food-db-delta.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
  - docs/agent/nutrition-food-db-source.md
  - docs/requirements/feature-diet-management-state-mapping.md
updated_at: 2026-07-19
approved_at: 2026-07-19
version: 0.4
tags: [requirements, prd, nutrition, food-db, server]
---

# 공개 영양 식품 DB (NutritionFood) PRD v0.4 (approved)

> **HUMAN 승인:** 2026-07-19 — PRD v0.4 + API 계약 v1.17 + 출처 메모 + 상태 매핑 §6.  
> Gate 1(본 범위: DB·API·import, UI 없음) **충족**. 구현 착수 가능.

## 0) 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 (개인사업자·법인·사업자등록 미보유) |
| 수익 | 광고 + 후원 수준만. 본 기능은 결제·구독과 무관 |
| 결제·정산 | 본 PRD 범위에 없음 |

### 0.1 모체 PRD·운영 문서와의 관계 (충돌 시)

| 주제 | 모체/기존 | 본 PRD |
|---|---|---|
| 과금(OCR·프리미엄) | 모체 `6.6`에 OCR 유료·구독 문구 있음 | **NutritionFood 검색·import는 과금·OCR 쿼터와 무관**. `product-monetization-default`·`privacy.md`(현재 인앱 결제 미제공)를 우선 |
| 식사 기록 단위 | `FoodTemplate` 또는 수기 입력 | **1차에서 Meal 생성 경로·단위 불변**. NutritionFood는 카탈로그만; 기록 연동은 후속 |
| AI `nutrition_kb` | RAG용 markdown corpus(deprecated 트랙) | **별개**. NutritionFood는 식품 100g당 매크로 테이블이며 벡터/KB 아님 |
| 개인정보 | `privacy.md` 식단·OCR | 공개 식품 카탈로그는 **개인정보 아님**. 수집·위탁 항목 추가 없음(1차) |

## 1) 목적

- 식약처(K-FIND) 계열 **공개 식품 영양 데이터**를 우리 DB에 적재해, 이후 `음식명 + 그램 → 영양 자동 입력`의 근거로 쓴다.
- 이번 범위는 **데이터 계층 + 검색 API + import 도구**까지다. 모바일 기록 UI·사진 인식은 후속.

## 2) 확정 결정 (2026-07-19 HUMAN)

| ID | 항목 | 결정 |
|---|---|---|
| D-1 | 소스 | **식약처(K-FIND / 식품영양성분 통합·공개 덤프)만**. USDA 등 병행 없음 |
| D-2 | 규모 | **큐레이션 500~2,000건** + import 도구. 1차 목표 **약 1,000건**. 전체 덤프 일괄 적재는 후순위 |
| D-3 | 저장 | **`NutritionFood` 테이블 분리**. 기존 `FoodTemplate`에 bulk 넣지 않음 |
| D-4 | API | 본 PR에 **`GET` 검색 API** 포함 (다음 UI가 바로 붙도록) |

## 3) 적용 범위

### 포함
1. Prisma `NutritionFood` 모델 + 마이그레이션
2. CLI/스크립트 import (`source` + `externalId` upsert, 건수·스킵·오류 리포트)
3. 100g당 매크로 정규화 및 환산 헬퍼 (`computeScaledNutritionFromGrams`와 **동일: 반올림 없음**, `servingGrams=100` 가정 시 동치)
4. `GET /me/nutrition-foods` 검색(인증 USER)
5. `GET /admin/nutrition-foods` 점검용(**필수**, AC-05)
6. 출처·인용·재import 절차 문서 (`docs/agent/nutrition-food-db-source.md`)
7. `apps/server/data/nutrition-food/raw/` gitignore

### 제외
- 모바일/웹 **기록 UI** (이름+g 자동입력 화면)
- Vision/사진 인식, LLM으로 영양 숫자 생성
- `FoodTemplate` 자동 승격 UI, Meal/`POST /meals` 계약 변경
- 바코드, 동의어 DB, 전문검색(Elastic 등)
- 실시간 식약처 Open API 의존(쿼터·장애) — **오프라인 덤프 import만**
- 유료·결제·OCR 쿼터 연동, 검색 호출 유료화
- `category`를 admin `foodCategories`(한식/중식…)로 강제 매핑
- CLI import에 대한 관리자 감사 로그(1차). 후속 soft-deactivate API 도입 시 재검토

## 4) 데이터 모델 (요약)

`NutritionFood` (공개 카탈로그, 읽기 위주):

| 필드 | 설명 |
|---|---|
| `id` | 내부 cuid |
| `source` | `String`, 1차 값만 `MFDS` (enum 확장 여지). import 시 그 외는 skip |
| `externalId` | 원본 식품코드. 길이 **1~64**. `@@unique([source, externalId])` |
| `name` | 표시명. 길이 **1~120** (trim 후) |
| `nameNormalized` | 검색용. **유니코드 NFC + 연속 공백 축소 + trim**. 라틴 casefold; 한글 자모 분해 없음 |
| `category` | 원본 분류, nullable. 길이 ≤ **50**(초과 시 truncate 또는 skip — **truncate+리포트**로 통일). FoodTemplate UI 카테고리와 별개 |
| `per100gCalories` / `per100gProtein` / `per100gFat` / `per100gCarbohydrate` | **100g당** `Float`, 필수, 비음수·유한수 |
| `defaultServingGrams` | 선택 `Float?`. 있으면 **> 0**. null이면 후속 UI·클라가 **100** 가정 |
| `sourceVersion` | import 배치 문자열. 길이 **1~40**. CLI **필수** |
| `importedAt` | 마지막 upsert 시각 |
| `createdAt` | 최초 insert (`@default(now())`) |
| `active` | 검색 노출(기본 true) |
| `deactivatedAt` | `active=false`로 둘 때 시각(선택, FoodTemplate 패턴). 1차 API로 토글 없음 |
| `rawPayload` | 선택 Json. API 응답 미포함 |

기존 `FoodTemplate` / `Meal` / `MealSet` **스키마 변경 없음**. FK·동기화 없음.

### 환산 규칙

```
scale = userGrams / 100
macros = per100gMacros × scale   // 반올림·정수화 없음 (mealFromTemplate과 동일)
```

후속 UI에서 템플릿 환산과 맞출 때: `servingGrams = 100`, `portionUnit = GRAM` 매핑으로 `computeScaledNutritionFromGrams` 재사용 가능.

## 5) import 정책

- 입력: 정규화된 CSV/JSON (원본 엑셀·대용량은 `apps/server/data/nutrition-food/raw/` + **gitignore**)
- upsert 키: `(source, externalId)`
- 필수 매크로 누락·음수 → 해당 행 스킵 + 리포트
- `(source, externalId)` 기준 재실행 **멱등**(동일·다른 `sourceVersion` 모두 덮어쓰기). `sourceVersion`은 추적용
- 큐레이션 목록: 자주 먹는 한식·가공·외식 후보 우선. 구체 목록은 import 매니페스트로 관리
- 앱/설정/법적 고지에 출처 한 줄(후속 UI·스토어 문구 시): 출처 문서 참조
- **재import 고아 행:** 새 파일에 없는 `(source, externalId)`는 **자동 비활성화하지 않음**(1차). 정리 필요 시 후속 CLI/운영 절차
- 행·파일 단위 실패 규칙은 §5.1

### 5.1 import 엣지케이스·종료 코드

| 상황 | 동작 |
|---|---|
| `--sourceVersion` 누락·빈값 | **exit ≠ 0**, DB 변경 없음 |
| 파일 없음·읽기 실패 | **exit ≠ 0**, DB 변경 없음 |
| 파일 파싱 실패·인코딩으로 필수 컬럼 식별 불가 | **exit ≠ 0**, 변경 없음 (단일 규칙) |
| 빈 파일 / 데이터 행 0 | **exit ≠ 0**. DB 유지 |
| 행: `externalId`/`name` 빈값·길이 초과 | **skip** |
| 행: 매크로 누락·음수·NaN·Infinity | **skip** |
| 행: `defaultServingGrams` ≤ 0 | **skip** |
| 행: 100g 환산 불가 | **skip** |
| 행: `source` ≠ `MFDS`(1차) | **skip** |
| 파일 내 동일 `externalId` 중복 | **마지막 행 우선**, `duplicateInFile` 카운트 |
| 유효 행 ≥1 + 일부 skip | **exit 0** |
| 유효 행 0 (모두 skip) | **exit ≠ 0** |
| upsert DB 오류 | **청크(100행) 단위 커밋**. 실패 청크에서 중단·exit ≠ 0. **이전 청크는 유지**. 리포트에 `committedChunks` |

리포트 필수: `upserted`, `skipped`, `skippedByReason` (또는 `errors[]`에 `row`+`code`), `duplicateInFile`, `sourceVersion`, `exitCode`.

skip/error `code` (고정 집합): `EMPTY_EXTERNAL_ID` · `EMPTY_NAME` · `NAME_TOO_LONG` · `EXTERNAL_ID_TOO_LONG` · `INVALID_MACRO` · `INVALID_SERVING` · `SCALE_FAILED` · `WRONG_SOURCE` · `CATEGORY_TRUNCATED`(정보성, upsert는 진행).

## 6) API (계약 SSOT)

상세: [`api-contract-v1.17-nutrition-food-db-delta.md`](./api-contract-v1.17-nutrition-food-db-delta.md)

- `GET /me/nutrition-foods?q=&page=&size=15` — active만. 쿼리 키는 **`q`**(v1.16 식사 검색과 동일). `food-templates`의 `query`와 **이름만 다름**(의도적)
- `q` 빈 값: active 전체 페이지네이션(에러 아님). 무매칭: `items:[]`, `total:0`
- `GET /admin/nutrition-foods?...` — ADMIN, `includeInactive` 선택
- Meal 생성·Foods CRUD·OCR·Billing 계약 **변경 없음**
- import는 **HTTP 업로드 없이 CLI**
- 검색 호출 **사용량 한도 없음**(OCR 5회와 무관). 남용 시 후속으로 rate limit만 검토
- 페이지·검증·권한 엣지는 §6.1·계약 §2.1
- **경로:** `GET /me/nutrition-foods` (meals의 `/meals` 단축과 혼동 금지)

### 6.1 API·환산 엣지케이스 (요약)

| 영역 | 규칙 |
|---|---|
| 권한 | `/me`: USER만. ADMIN·미인증 → 403/401. `/admin`: ADMIN만. USER → 403 |
| inactive | USER 목록에 **절대 미포함**. admin은 `includeInactive=true`일 때만 |
| 카탈로그 0건 | 200 + `items:[]` + `total:0` (에러 아님) |
| `q` trim 후 빈 문자열 | 전체 목록과 동일(AC-07) |
| `q` 길이 > 60 (trim 후) | **422** `VALIDATION_FAILED` `field=q` |
| `q` 특수문자·이모지 | ORM `contains`로 안전 처리. 매칭 없으면 AC-06 |
| 검색 매칭 | `(name contains q) OR (nameNormalized contains qNormalized)` — 둘 중 하나면 포함 |
| `page`/`size` | **clamp**(food-templates와 동일). 비숫자·NaN → 기본 `page=1`,`size=15`. **422 아님** |
| `page`가 마지막 초과 | 200 + `items:[]`, `total`은 필터 전체 건수 유지 |
| `includeInactive` | admin만. `true`/`1`만 true. `/me`에 전달 시 **무시** |
| 환산 헬퍼 `grams` | `grams <= 0` 또는 비유한수 → **throw**. 1차는 단위 테스트. Meal 상한 `1..5000`은 후속 기록 API |
| 응답 `category` | 없으면 JSON **`null`** (필드 생략 금지) |
| 응답 매크로 | import가 비음수·유한수만 넣음 |

## 7) 화면 / 디자인

- **UI 없음** → `65-design-gate`·이중 목업 **면제**
- 상태 스펙은 API만: 기본·목록(빈 `q`) / 무매칭 / 카탈로그 공허 / 422(`q`) / 401 / 403 / 페이지 초과(빈 items)

## 8) 비기능·보안(라이트)

보안 게이트=아니오. vibe-coding baseline:

- 시크릿: 공개 덤프만 사용, API 키 불필요. 원본 대용량·개인정보 없음
- 인증: `/me/*`는 USER, `/admin/*`는 ADMIN 서버 검사
- 입력: ORM 파라미터화 검색, `q` 길이 상한
- rate limit: 기존 me 라우트 정책 준수(별도 LLM 비용 없음)
- BaaS 해당 없음

측정·성능 게이트: 본 PRD에서 아니오.

## 9) 수용 기준 (AC)

### AC-01 import upsert
- Given 유효한 큐레이션 import 파일과 `--sourceVersion`
- When CLI import 실행
- Then 리포트 `upserted` 건수만큼 `(source, externalId)` 행이 존재하고 매크로가 파일과 일치한다
- And **전체 active 건수 = upserted 가 아닐 수 있음**(고아·기존 inactive 유지). active 전량 일치로 단정하지 않는다

### AC-02 검색 부분일치
- Given active `NutritionFood`에 "닭가슴살"이 있음
- When `GET /me/nutrition-foods?q=닭가슴` (인증 USER)
- Then 해당 항목이 포함되고 응답 `per100g.calories|protein|fat|carbohydrate` 4필드가 반환된다

### AC-03 환산 헬퍼
- Given per100g calories=165
- When userGrams=150
- Then calories = **247.5** (반올림 없음; `computeScaledNutritionFromGrams` with servingGrams=100과 동치)

### AC-04 기존 회귀
- Given 기존 FoodTemplate / Meal API
- When NutritionFood 마이그레이션·시드 후
- Then 기존 CRUD·식사 기록이 깨지지 않는다 (스모크)

### AC-05 권한
- When 미인증으로 `GET /me/nutrition-foods` → 401
- When USER로 `GET /admin/nutrition-foods` → 403
- When ADMIN으로 `GET /admin/nutrition-foods` → 200
- When ADMIN으로 `GET /me/nutrition-foods` → 403

### AC-06 무매칭 검색
- When `q`가 매칭 없음(비어 있지 않은 문자열)
- Then 200 + `items: []` + `total: 0` (에러 아님)

### AC-07 빈 q 목록
- When `q` 생략 또는 공백만
- Then 200 + active 페이지 목록(`total` ≥ 0). 422 아님

### AC-08 q 길이 초과
- When trim 후 `q` 길이 > 60
- Then 422 `VALIDATION_FAILED`, `details.field = "q"`

### AC-09 페이지네이션 clamp·초과 페이지
- When `page=0` 또는 `size=999` 또는 비숫자
- Then 422 없이 clamp/기본값 적용 후 200
- When `page`가 결과 범위를 넘김
- Then 200 + `items:[]` + `total`은 실제 필터 건수

### AC-10 inactive 숨김
- Given 동일 이름 active/inactive 각 1건
- When USER `GET /me/nutrition-foods?q=...`
- Then inactive 미포함. admin `includeInactive=true`일 때만 inactive 포함

### AC-11 import 스킵·실패
- When 파일에 음수 칼로리 행과 정상 행이 섞임
- Then 정상만 upsert, skip 리포트, exit 0
- When 파일 없음 또는 유효 행 0 또는 `--sourceVersion` 누락
- Then exit ≠ 0

### AC-12 환산 가드
- When `grams <= 0` 또는 non-finite
- Then 헬퍼는 예외(또는 명시적 Result 실패). 정상 `grams=150`만 AC-03

### AC-13 HTTP 경로
- When 클라이언트가 `GET /me/nutrition-foods` 호출 (food-templates와 동일 `/me` 접두)
- Then 200 정상. (`/nutrition-foods` 단축 경로 없음 — meals의 `/meals` 예외와 혼동 금지)
## 10) 역할·트랙

| 역할 | 이유 |
|---|---|
| **backend-agent** (Owner) | 스키마·import·검색 API·AC 테스트 |
| **docs-agent** | 출처·매핑·재import 문서 (병렬 가능) |
| frontend / design | 본 범위 제외 |

**Gate 2 / parallel-delivery:** UI+API 병렬 아님 → **해당 없음**.  
Integration Owner = backend-agent.

## 11) Gate 1 점검

| 항목 | 상태 |
|---|---|
| PRD 범위·정책·AC | 충족 |
| API 계약 | v1.17 delta (**fixed**) |
| 화면/디자인 | N/A (면제) |
| 미확정 | **없음** (D-1~D-4 + §5.1·경로·필드 길이 잠금) |
| HUMAN 승인 | **2026-07-19** 완료 → 구현 착수 가능 |

## 12) 구현 순서 (승인 후)

1. Prisma + 마이그레이션 + raw gitignore
2. import 스크립트 + 샘플/큐레이션 매니페스트(~1,000)
3. 환산 헬퍼 + 단위 테스트 (AC-03)
4. `GET /me/nutrition-foods` + `GET /admin/nutrition-foods` + acceptance
5. 출처 문서·모체 교차 표기 동기화

### 소비 증거 (Gate 3, 1차)

- 횡단 kit 패키지 아님. **첫 소비자** = 서버 acceptance(및 수동 스모크)가 `GET /me/nutrition-foods`를 호출하는 것.
- 모바일 UI 소비는 **후속 PRD**. 1차 Gate 3는 API·import·AC로 판정.

## 13) 후속 (본 PRD 밖)

- 모바일: 음식명 검색 → g 입력 → `NutritionFood` 환산 초안 → 확정 후 Meal(수기 스냅샷 또는 템플릿 승격)
- (선택) 관리자 “템플릿으로 가져오기” + 감사 로그
- Vision은 그 위 입력 보조로만
- (선택) 앱 설정/법적 고지 출처 문구·`privacy` 개정은 UI 공개 시점에 검토

## 14) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-19 | 초안·D-1~D-4 확정 |
| 0.2 | 2026-07-19 | 모체 과금/기록단위/`nutrition_kb` 충돌 정리, admin 필수화, 반올림·정규화·q/query·AC-07·gitignore·소비 증거 보완 |
| 0.3 | 2026-07-19 | 엣지케이스·에러: import 종료코드/고아행, API clamp vs 422, inactive, AC-08~12 |
| 0.4 | 2026-07-19 | AC-01 active건수 충돌 수정, 경로 `/me/...` 고정, 필드 길이·sourceVersion·청크커밋·OR검색·상태매핑·AC-13 |
| 0.4+승인 | 2026-07-19 | HUMAN 문서 승인 기록. Gate 1 통과·구현 착수 가능 |
