---
type: prd
project: dietManagement
status: approved
owner: product
parent: docs/requirements/feature-nutrition-food-db-prd.md
related:
  - docs/requirements/api-contract-v1.17-nutrition-food-db-delta.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
  - docs/requirements/feature-diet-management-state-mapping.md
  - docs/design/mobile-log-input-ux-spec.md
  - docs/requirements/mobile-log-ux-improvements-prd.md
  - docs/agent/nutrition-food-db-source.md
updated_at: 2026-07-21
approved_at: 2026-07-21
version: 0.3
tags: [requirements, prd, nutrition, mobile, autofill]
---

# 모바일 영양 자동 채움 (NutritionFood → Meal) PRD v0.3 (approved)

> **HUMAN 승인:** 2026-07-21 — PRD v0.3 + D-1~D-9 + §5.7 엣지·에러.  
> Gate 1(범위·정책·AC·API 소비): **충족**. 구현·디자인 승인 완료.  
> **Supersede (부분):** [`feature-grams-only-transition-prd.md`](./feature-grams-only-transition-prd.md) Phase 1이 Log **신규 입력의 템플릿·1인분 병행** 가정을 대체한다. NF 검색·환산·§6.1 payload·§5.7은 **유효**.

## 0) 전제·가정

| 항목 | 값 |
|---|---|
| 사업자 | 없음 (개인사업자·법인·사업자등록 미보유) |
| 수익 | 광고 + 후원 수준만. 본 기능은 결제·구독·OCR 쿼터와 무관 |
| 결제·정산 | 본 PRD 범위에 없음 |

### 0.1 모체·기존과의 관계 (충돌 시 본 PRD)

| 주제 | 기존 | 본 PRD (1차) |
|---|---|---|
| NutritionFood API | v1.17 `GET /me/nutrition-foods` | **소비만**. 신규 서버 엔드포인트·계약 bump 없음 |
| 모체 §13 | 수기 스냅샷 **또는** 템플릿 승격 | **수기 스냅샷만**. 승격·`nutritionFoodId` FK 후속 |
| Meal 계약 문서 | 수동 시 `portionQuantity` 미저장(null) 문구 | **본 기능 payload는 §6.1 표가 SSOT**. 모체 stale 문구는 별도 delta(후속 문서 정리) |
| Log 수기 UX | 폼=1인분 영양, 신규 시 `portionQuantity:1`·**`grams` 미전송**(서버 기본 100) | **NutritionFood 초안 모드**는 g 총량 모델(§5.1). 기존 순수 수기·OCR 경로는 유지 |
| FoodTemplate / suggestions | `meal-entry-suggestions` | **병행·병합 금지**. 섹션·copy 분리 |
| FoodSearchScreen | 「음식 검색」(과거 이력) | **비변경**. 문자열·라우트 공유 금지 |
| state-mapping §6 빈 q | 전체/인기 목록(후속) | **1차 예외:** q trim≥1일 때만 호출·표시(§5.3). 매핑 문서에 교차 표기 |
| 환산·표시 | 모체: 반올림 없음 / 앱 hydrate: `Math.round` | 초안·저장·재표시(초안 세션)는 **소수 유지**. `roundPerServingForForm`은 NF 경로에 **미적용** |
| 출처 | source.md: 「식품의약품안전처 식품영양성분 DB 기반(일부)」 | D-7 **동일 문구** 고정. 「추정」 금지 |
| 과금 | OCR·프리미엄 | 검색·환산·기록 **무료·쿼터 무관** |
| privacy | 공개 카탈로그=개인정보 아님 | 신규 수집 없음. 출처 UI 노출 시 privacy **검토만**(개정 필수 아님) |

## 1) 목적

사용자가 Log에서 **음식명을 검색 → 그램을 입력/수정 → 100g당 영양을 환산한 총량 초안을 확인 → 확정**하면, 수기 Meal로 기록한다.  
기록된 Meal은 기존과 같이 목록·통계에 쓰이며, 카탈로그 FK는 남기지 않는다.

## 2) 확정 결정 (HUMAN 2026-07-21)

| ID | 항목 | 결정 |
|---|---|---|
| D-1 | 진입점 | **LogScreen 통합 입력 폼 슬롯 보강**. 신규 라우트 없음 |
| D-2 | 저장 | **수기 스냅샷** + §6.1 payload(`grams` **필수 전송**). FK·승격 없음 |
| D-3 | 검색 UX | 노출 라벨 **「영양성분 DB(식약처)」**. suggestions와 **병행·비병합**. 보조: 「내 기록·템플릿과 별개」 |
| D-4 | 환산 | 클라: `scale = grams/100`, 매크로 = per100g × scale, **반올림 없음**. scale API 없음 |
| D-5 | 기본·범위 g | 선택 시 `defaultServingGrams ?? 100`. 저장 **1..5000**. ≤0·비유한수 저장 불가 |
| D-6 | 디자인 | **67 면제**. `mobile-log-input-ux-spec` 증분 + §0 면제 기록 |
| D-7 | 출처 | **「식품의약품안전처 식품영양성분 DB 기반(일부)」** 한 줄. privacy 개정은 후속 검토 |
| D-8 | 폼 모델 | **초안 모드:** 섭취 **g 필드**, 매크로=해당 g **총량**. `scaleManualNutritionForSave` 미사용. 신규 `portionQuantity: 1` |
| D-9 | 편집 범위 | Log 신규 + Log 인라인 편집. **MealEditModal·FoodSearch Out** |

## 3) 적용 범위

### 포함
1. `GET /me/nutrition-foods` 모바일 클라이언트(응답 `per100g` nested 파싱)
2. Log: 검색 섹션·선택·g·총량 매크로 초안·출처·수동 잠금
3. 확정 저장/수정: §6.1 payload → 기존 `POST /meals` / `PUT /meals/{id}`
4. 상태 UI: §7 + state-mapping §6(빈 q 예외 포함)
5. 클라 환산 유틸 + 단위 테스트(모체 AC-03 동치: 165×1.5=247.5)
6. 디자인 스펙 증분(67 면제·섹션 순서·다크 체크리스트) + `LOG_COPY` 키
7. ATDD-lite: 환산·payload 조립·가능 시 API 클라 스모크

### 제외
- Vision/사진 → 이름·g
- Meal 스키마 `nutritionFoodId` / 계약 bump
- FoodTemplate·MealSet 승격
- FoodSearchScreen·MealEditModal·admin-web
- 서버 신규 API
- 카탈로그 ~1,000 큐레이션(운영 import 별도; 프로드 샘플 소수 시 빈 결과 흔함 → copy로 흡수)
- 유료·OCR 쿼터·동의어·바코드·전문검색
- 빈 q 브라우징·페이지 더보기
- analytics 새 이벤트(1차 Out; 기존 `mealRecorded` `input_mode`는 `manual` 유지)

## 4) 사용자 흐름

```
Log 탭 → 음식명 입력(debounce 300ms, suggestions와 동일)
  → [기존] 템플릿/과거 식사 제안
  → [신규] 「영양성분 DB(식약처)」 섹션
       · q trim length ≥ 1 일 때만 요청 (page=1, size=15, UI 표시 상위 8)
       · 더보기/page>1 없음
     → 항목 탭 → 초안 모드 ON
        → name = 카탈로그 name(≤120, trim)
        → grams = defaultServingGrams ?? 100 (클램프 1..5000)
        → 매크로 4종 = 총량 환산(소수 유지)
        → 출처 한 줄(D-7)
        → 템플릿 선택 해제, 1인분 분량 입력 UX 숨김·g 필드 표시
     → g 변경(잠금 전) → 매크로 재환산
     → 매크로 중 하나라도 직접 수정 → 4종 전부 수동 잠금
  → 저장 → §6.1 수기 Meal
무매칭(q≥1, total=0) → 「검색 결과 없음」 + 수기 계속
카탈로그 공허(동일 total=0) → 동일 빈 UI(구분 문구 선택: 「아직 등록된 식품이 없어요」는 후속; 1차는 단일 빈 문구)
오류 → 해당 섹션만 실패, suggestions·수기·템플릿은 계속 사용
```

## 5) 정책·예외

### 5.1 NutritionFood 초안 모드 (D-8) — Critical

| 항목 | 정책 |
|---|---|
| 진입 | NutritionFood 항목 선택 시 ON. 템플릿 선택·OCR 프리필과 상호 배타(나중 동작이 이김: NF 선택 시 템플릿 해제) |
| 폼 | **섭취량(g)** 필드 필수 표시. 매크로 = **그 g의 총량**(「1인분 기준」힌트 숨김) |
| 저장 | body에 **`grams`를 환산에 쓴 값으로 전송**. 매크로는 폼 총량 그대로. **`scaleManualNutritionForSave` / 신규 portion×매크로 경로 사용 금지** |
| portionQuantity | 신규: **`portionQuantity: 1`**. 편집: 기존 값 유지하되, 초안 모드 재저장 시에도 매크로는 폼 총량·`grams` 갱신(분량 배수 재적용 없음) |
| 목록 −/+ | 저장 후 기존 수기와 동일(배수 조절). copy: 「목록 분량은 배수예요. 그램을 바꾸려면 다시 편집하세요」 |
| 종료 | 템플릿 선택, 폼 리셋, 다른 입력 모드 전환 시 OFF |

### 5.2 재환산·잠금

| 주제 | 정책 |
|---|---|
| 재환산 | 초안 모드·잠금 OFF에서 g만 변경 → 4종 재환산 |
| 수동 잠금 | 매크로 **한 필드라도** 사용자 수정 → **4종 전부** 잠금. g 변경해도 매크로 미덮어씀. 힌트 문구 표시 |
| 잠금 해제 | 다른 NutritionFood 재선택 시 해제·재채움. 이름만 수정해도 잠금 **유지** |
| 이름 | 수정 허용. 길이 저장 시 **1..120**(카탈로그와 동일 상한). 비면 저장 불가(기존 `nameRequired`) |
| 템플릿 충돌 | 템플릿 선택 중이면 템플릿 분량 UX 우선. NF 선택 시 템플릿 해제·초안 모드. **TOTAL_GRAMS 템플릿 란과 NF g 필드 동시 노출 금지** |

### 5.3 검색·API 소비

| 주제 | 정책 |
|---|---|
| 호출 조건 | `q.trim().length ∈ [1, 60]` 일 때만 `GET /me/nutrition-foods` |
| q > 60 | API **호출하지 않음**. 인라인 「검색어는 60자까지」. 서버 422는 동일 의미 방어 |
| 빈 q | 섹션 숨김·요청 없음(state-mapping §6 1차 예외) |
| debounce / 한도 | **300ms**, UI 표시 **최대 8건**(`size=15` 요청, slice). page=1 only |
| 응답 | `items[].per100g.{calories,protein,fat,carbohydrate}`, `defaultServingGrams`, `name`, `id`, `source`, `externalId` |
| inactive | 클라 필터 없음(API active만) |
| 부분 실패 | nutrition 검색 실패 ≠ suggestions 실패. 각각 독립(AC-08) |
| 오프라인 | 검색 오류와 동일 취급 + 수기/템플릿 유지 |
| 권한 | 일반 USER·401 → 기존 로그인. ADMIN 403은 앱 1차 비대상 |

### 5.4 숫자·표시

| 주제 | 정책 |
|---|---|
| 환산 | 반올림·정수화 없음(모체와 동일) |
| 표시 | 소수 **최대 1자리** 권장(불필요 0 생략 가능). 입력 `,`→`.` 는 `parseManualNutrition`과 동일 |
| hydrate | 초안 모드 재표시·저장 직전: **`roundPerServingForForm` 금지** |
| 매크로 범위 | 클라·서버: 비음수·유한수(`VALIDATION_FAILED`+field). MealSet 한도(cal≤10000 등)는 **본 경로 비적용** |
| grams | 클라 **1..5000** 차단(1차 SSOT). 서버 수기 POST는 현행 범위 미검증 → 강화 **Out**(E-V6). defaultServing 이상치는 E-D9 |

### 5.5 카피·접근성·테마

| 주제 | 정책 |
|---|---|
| 섹션 제목 | 「영양성분 DB(식약처)」 — FoodSearch 「음식 검색」과 공유 금지 |
| 출처 | D-7 문구 고정 |
| a11y | 섹션 헤더·행 버튼 역할 명확. 아이콘만으로 구분 금지. 로딩/빈 상태 텍스트 |
| 다크모드 | 기존 `theme.tsx`만. 스펙에 보더/스피너/섹션 대비 체크리스트 |
| 구버전 앱 | 기능 없으면 무시(강제 업데이트 아님) |

### 5.6 비기능·보안(라이트)

- vibe-coding-baseline 5항.
- BaaS/LLM 신규 없음.
- 측정·분석 / 성능 게이트 / 보안 게이트(엄격): **아니오**(1차).

### 5.7 엣지케이스·에러 처리 (SSOT)

검색 훅 패턴은 `useMealEntrySuggestions`(AbortController·stale discard·`isRequestAborted` 무시)를 **미러**한다.

#### 5.7.1 검색

| ID | 상황 | 정책 | UI |
|---|---|---|---|
| E-S1 | 연속 입력 / debounce 취소 | 300ms 내 재입력 시 이전 타이머 취소·요청 없음 | idle 또는 직전 성공 목록 유지 금지 시 섹션 로딩 전 비움 — **로딩 시작 시 목록 비움**, 성공 시 교체 |
| E-S2 | 느린 응답이 최신 q를 덮음 (race) | 요청 세대번호 또는 AbortController. **stale 응답 discard** | 오류로 표시하지 않음 |
| E-S3 | Abort / 언마운트 | AbortError·취소는 **오류 UI 금지** | 상태 갱신 없음 |
| E-S4 | 네트워크 / 타임아웃 / 5xx | 동일 `error` 상태 | `nutritionDbError` + 재시도. suggestions·수기 유지 |
| E-S5 | 응답 파싱 실패(비JSON·스키마 붕괴) | E-S4와 동일 | 동일 |
| E-S6 | 401 (검색) | suggestions와 동일: **전역 toast 금지**. 섹션만 error. 토큰 갱신은 앱 공통 | 재시도 시 `ensureAccessToken` |
| E-S7 | 403 (비USER) | 앱 일반 경로 비대상. 오면 E-S4와 동일 섹션 오류 | — |
| E-S8 | 422 `field=q` | 클라 선차단이 기본. 서버 422 시 동일 문구 | `nutritionDbQTooLong` |
| E-S9 | 공백-only q | trim 후 길이 0 → 미호출 | 섹션 숨김 |
| E-S10 | 유니코드/정규화 | 요청 q는 trim(+가능하면 NFC). 서버가 `name` OR `nameNormalized` 검색 — 클라 미정규화여도 **허용**(서버 OR로 완화). 문서화만 | — |
| E-S11 | 동명 항목 | `key=id`. 행 보조: `category` 있으면 표시, 없으면 per100g 칼로리 힌트(선택) | 잘못된 항목 선택 방지 |
| E-S12 | 로딩 중 저장 | **저장을 막지 않음**. 초안 미선택이면 순수 수기/템플릿 경로 | — |
| E-S13 | 로딩 중 이전 결과 | 새 요청 시작 시 **목록 비움 + 스피너**(깜빡임 허용). 이전 q 결과로 잘못 탭 방지 | — |

#### 5.7.2 초안·모드 전환

| ID | 상황 | 정책 |
|---|---|---|
| E-D1 | OCR → NF 선택 | OCR 스냅샷/메타 **클리어**. 템플릿 해제. 초안 모드 ON·g·총량 매크로·출처 |
| E-D2 | NF → OCR 성공 | 초안 모드 OFF·출처 숨김·g 필드 숨김. 기존 OCR→수기(1인분) hydrate. 잠금 리셋 |
| E-D3 | 초안 후 이름 비움 | 초안 모드·g·매크로·출처 **유지**. 저장만 `nameRequired`로 차단 |
| E-D4 | 초안 후 mealSlot 변경 | 초안 **유지**. SNACK이면 기존 Log처럼 `snackPlacement` 기본/필수 검사 |
| E-D5 | 인라인 편집 + NF 재선택 | `roundPerServingForForm` 미적용. PUT에 `grams`+총량. portionQuantity 배율로 매크로 재곱하지 않음 |
| E-D6 | 환산 결과 non-finite | 저장 차단 + 안내. NaN/Infinity **미전송** |
| E-D7 | grams 소수 | 허용(예: 150.5). `,`→`.` . 표시 최대 1자리 권장. 범위 1..5000 |
| E-D8 | name > 120 | 저장 차단(클라). 선택 시 카탈로그 name는 ≤120 보장 |
| E-D9 | defaultServingGrams ≤0 / 비유한 / >5000 | 선택 시 grams = clamp 유효값, 불가 시 **100**. >5000 → 5000 |

#### 5.7.3 저장

| ID | 상황 | 정책 | UI |
|---|---|---|---|
| E-V1 | 더블탭 / 연타 | 기존 `saveInFlightRef`+`saveBusy` 적용. 진행 중 재탭 무시 | Primary loading |
| E-V2 | 신규 멱등 | 기존 `clientRequestId` 유지 | — |
| E-V3 | 401 (저장) | Log와 동일: **toast 없이 return**(또는 로그인 유도 — 기존 `isAuthDenied` 분기 준수) | 전역 toast 남발 금지 |
| E-V4 | 422 매크로 | 서버 `VALIDATION_FAILED`+`field` → 해당 필드/토스트. 클라 finite·≥0 선검사 | 행동 가능 문구 |
| E-V5 | SNACK·snackPlacement 누락 | 기존 Log 클라 검사 우선. 서버 422 시 동일 | `snackPlacementRequired` |
| E-V6 | grams 클라 1..5000 | **1차 SSOT=클라 차단**. 서버 수기 POST는 grams 범위 미검증(현행) — **서버 강화는 Out**(후속). AC에 명시 |
| E-V7 | 저장 성공 후 목록 −/+ | 기존 수기: 매크로 **배수**. DB `grams`는 목록 조작으로 안 바뀜(현행 adjust와 동일). 힌트 copy 유지 | `nutritionDbListPortionHint` |

#### 5.7.4 에러 코드 매핑 (검색)

| HTTP / 조건 | 앱 처리 |
|---|---|
| 200 `total=0` | 빈(에러 아님) |
| 401 | E-S6 |
| 403 | E-S7 |
| 422 `field=q` | E-S8 |
| 5xx / 네트워크 / 파싱 | E-S4 / E-S5 |
| Abort | E-S3 (무시) |

## 6) API 계약

- 검색 소비: [`api-contract-v1.17-nutrition-food-db-delta.md`](./api-contract-v1.17-nutrition-food-db-delta.md)
- 저장: 기존 `POST /meals` / `PUT /meals/{id}` — **본 기능의 요청 필드는 아래 표가 우선**

### 6.1 NutritionFood 초안 저장 payload (SSOT)

| 필드 | 신규 POST | 편집 PUT | 비고 |
|---|---|---|---|
| `name` | 필수, 1..120 | 동일 | |
| `grams` | **필수**, 1..5000 | 동일(갱신) | 서버 기본 100에 의존 **금지** |
| `calories` `protein` `fat` `carbohydrate` | 필수, 총량, ≥0 유한수 | 동일 | 폼 총량 = 저장 총량 |
| `foodTemplateId` | 생략 또는 null | null로 클리어 | 템플릿 모드 아님 |
| `mealInputMode` | 생략 | 생략/클리어 | |
| `portionQuantity` | **1** | 기존 유지 또는 1 | 목록 배수 UX용. 매크로에 재곱하지 않음 |
| `mealSlot` / `consumedAt` / `snackPlacement` / `clientRequestId` | 기존 Log와 동일 | 동일 | |

Gate 2: API 기확정 + 디자인(67) 승인 후 모바일만. **parallel-delivery 해당 없음.**

## 7) 화면·상태

디자인 스펙(`mobile-log-input-ux-spec`) §1 순서에 삽입:

> 통합 입력 폼 음식명 포커스/입력 시: (1) 기존 suggestions (2) **영양성분 DB(식약처)** 블록

| 상태 | UI |
|---|---|
| 기본 | q 없음 → 섹션 비표시 |
| 로딩 | 목록 비움 + 섹션 스피너(E-S13). 저장은 막지 않음(E-S12) |
| 빈 | 「검색 결과 없음」 + 수기 계속 |
| 오류 | 섹션 오류+재시도(E-S4). 검색 401은 전역 toast 금지(E-S6) |
| 권한 | 저장 401은 Log `isAuthDenied`와 동일(E-V3) |
| 초안 완료 | g·매크로·출처 표시, 저장 가능 |
| q 초과 | 60자 안내, 요청 없음 |

다크모드: 기존 토큰만.

## 8) 수용 기준 (AC)

### AC-01 검색 표시
- Given 카탈로그에 「닭가슴살」 active
- When Log에서 `닭가슴` 입력(debounce 후)
- Then 「영양성분 DB(식약처)」 섹션에 항목이 보이고 suggestions와 구분된다

### AC-02 선택 → 총량 초안
- Given per100g calories=165, defaultServingGrams=150
- When 항목 선택
- Then name 채움, grams=150, calories=**247.5**(반올림 없음), P/F/C 동일, 초안 모드 ON

### AC-03 기본 g
- Given defaultServingGrams=null
- When 선택
- Then grams=100, macros = per100g × 1

### AC-04 g 변경 재환산
- Given 선택 직후 잠금 OFF
- When grams=200
- Then macros = per100g × 2

### AC-05 수동 잠금(4종)
- Given 선택 후 calories만 직접 수정
- When grams 변경
- Then calories·protein·fat·carbohydrate **모두** 덮어쓰지 않는다

### AC-06 빈 결과
- When q≥1 무매칭
- Then 빈 문구 + 수기 가능(에러 아님)

### AC-07 저장 payload
- When 초안 확정 저장
- Then POST body에 `grams`=폼 g, 총량 매크로, `foodTemplateId` 없음, `portionQuantity`=1  
- And 서버에 저장된 grams가 100으로 떨어지지 않는다(미전송 회귀 방지)

### AC-08 부분 실패
- When nutrition 검색만 네트워크 실패
- Then 해당 오류 안내 + suggestions·수기·템플릿 사용 가능

### AC-09 회귀
- Given 템플릿·OCR·순수 수기(1인분) 흐름
- When NF UI 추가 후
- Then 기존 경로 동작·`roundPerServingForForm` 수기 hydrate 유지

### AC-10 출처
- When 초안 채움
- Then D-7 문구가 보인다

### AC-11 q 길이
- When trim 후 q 길이 > 60
- Then API 미호출 + 60자 안내

### AC-12 grams 상한
- When grams=0 또는 5001
- Then 저장 불가 + 안내. 유효 1..5000만 저장

### AC-13 템플릿 ↔ NF 전환
- Given 템플릿 선택 중
- When NF 항목 선택
- Then 템플릿 해제·초안 모드·g 필드 표시·템플릿 분량 UI 숨김

### AC-14 빈 q
- When 음식명 공백
- Then nutrition API 미호출·섹션 숨김

### AC-15 MealEditModal
- When 1차 범위
- Then MealEditModal에 NF 검색을 추가하지 않는다(회귀: 기존 편집 유지)

### AC-16 stale / abort
- Given q를 빠르게 연속 변경해 이전 요청이 늦게 응답
- When 최신 q와 다른 응답이 도착
- Then 목록을 덮지 않고, Abort/취소는 오류 UI를 띄우지 않는다

### AC-17 저장 연타
- Given 초안 저장 진행 중
- When 저장 버튼을 다시 탭
- Then 두 번째 요청이 나가지 않는다(`saveInFlight`/`saveBusy`)

### AC-18 검색 401
- When nutrition 검색이 401
- Then 섹션만 오류이고 전역 toast를 강제하지 않으며, suggestions·수기는 사용 가능

### AC-18b 저장 401
- When 초안 저장이 401/`isAuthDenied`
- Then 기존 Log와 동일하게 처리한다(toast 남발 없음)

### AC-19 매크로 422·finite
- Given 환산/입력 결과가 음수 또는 non-finite
- When 저장 시도
- Then 클라에서 차단하거나 서버 422 `field`에 맞춰 안내하고 NaN을 전송하지 않는다

### AC-20 SNACK placement
- Given mealSlot=SNACK, snackPlacement 없음, 초안 모드
- When 저장
- Then 기존 Log와 같이 저장 불가 + placement 안내

### AC-21 환산 non-finite
- When scale 결과가 Infinity/NaN
- Then 저장 불가 + 안내(E-D6)

### AC-22 grams 소수
- Given 초안 모드
- When grams=`150,5` 또는 `150.5` (범위 내)
- Then 파싱·재환산·저장에 쓰이고 강제 정수화하지 않는다

### AC-23 name 길이
- When name trim 후 길이 0 또는 >120
- Then 저장 불가

### AC-24 동명 카탈로그
- Given name이 같은 active 항목 2건(id 다름)
- When 검색 결과 표시
- Then 각각 선택 가능하고 row key는 id이다(category 등 보조 가능)

### AC-25 인라인 편집 + NF
- Given Log 인라인 편집 중
- When NF 항목 선택 후 저장
- Then PUT에 `grams`+총량 매크로, `roundPerServingForForm` 미적용

### AC-26 OCR → NF
- Given OCR으로 폼이 채워진 상태
- When NF 항목 선택
- Then OCR 스냅샷 클리어·초안 모드 ON·g 총량 모델

### AC-26b NF → OCR
- Given 초안 모드
- When OCR 분석 성공으로 폼을 채움
- Then 초안 모드 OFF·출처/g 필드 숨김·기존 OCR 수기 hydrate

### AC-27 로딩 목록
- When 새 검색 요청 시작
- Then 이전 결과로 탭하지 못하도록 목록을 비우고 스피너를 보인다

### AC-28 malformed 응답
- When 검색 응답 파싱 실패
- Then E-S4와 동일 섹션 오류(수기 유지)

### AC-29 정규화
- When 사용자가 호환 자모/공백이 다른 q로 검색
- Then 서버 OR 검색으로 매칭 가능하면 결과가 나온다(클라 NFC는 권장·필수 아님)

### AC-30 검색 로딩 중 저장
- Given NF 검색 스피너 표시 중, 초안 미선택·수기 값 유효
- When 저장
- Then 검색 로딩이 저장을 막지 않는다

### AC-31 초안 후 이름 비움
- Given 초안 모드
- When name만 비움
- Then g·매크로·출처는 유지되고 저장만 nameRequired로 실패한다

### AC-32 mealSlot 변경
- Given 초안 모드
- When mealSlot만 변경
- Then 초안(g·매크로·잠금·출처)이 유지된다

### AC-33 목록 배수 ≠ g 편집
- Given NF 초안으로 저장한 Meal(목록에 표시)
- When 목록 −/+ 로 분량 조절
- Then 기존 수기와 같이 매크로 배수만 변하고, 「그램 편집」이 아님을 힌트로 안내 가능하다

## 9) 역할·트랙

| 역할 | 이유 |
|---|---|
| **frontend-agent** (Owner / Integration) | LogScreen·API 클라·초안 모드·환산·상태 |
| **prd-agent** | 본 PRD·충돌 표·AC |
| **design-system-agent** | 67 면제 스펙 증분 |
| **qa-agent** | AC·회귀(수기 grams 미전송 방지) |
| backend-agent | 1차 해당 없음 |

**트랙:** 단일 모바일 순차. 충돌 주의: `LogScreen.tsx`, suggestions 훅 인접, `manualPortion`/`manualNutrition`, `api/`, `copy/log`.  
**Gate 2 / parallel-delivery:** **해당 없음**.

## 10) Gate 1 점검

| 항목 | 상태 |
|---|---|
| PRD 범위·정책·AC | v0.3 — **HUMAN 승인 2026-07-21** |
| API 계약 | v1.17 소비 기확정 + §6.1 payload 표 |
| 화면/디자인 | 67 면제 스펙 — **HUMAN 승인 2026-07-21** (=구현 착수) |
| 미확정 | **없음** (D-1~D-9 확정) |
| 앱 업데이트 | 강제 업데이트 아님. 구버전=기능 없음 |
| 카탈로그 규모 | 프로드 소수(샘플) 가능 — 빈 결과 copy로 흡수. 1,000건은 Out |

## 11) 구현 순서 (승인·디자인 후)

1. `mobile-log-input-ux-spec` 증분(§0 면제·섹션·상태·다크) + HUMAN 디자인 승인  
2. ATDD-lite RED(환산 247.5, payload에 grams 포함)  
3. `api/nutritionFoods.ts` + 환산 유틸  
4. Log: 검색·초안 모드·잠금·출처·저장 분기  
5. GREEN + verify-change(수기/템플릿/OCR 회귀)

## 12) 후속 (본 PRD 밖)

- 카탈로그 ~1,000 import
- Meal `nutritionFoodId`/출처 감사 필드
- 템플릿 승격·MealSet·MealEditModal 연동
- 빈 q 브라우징·더보기
- Vision 보조
- privacy/스토어 출처 고지 강화
- 모체 계약「수기 portionQuantity null」stale 정리 delta
- analytics `input_mode: nutrition_db`(선택)

## 13) 부록 — copy 키(초안)

| 키 | 문구 방향 |
|---|---|
| `nutritionDbSectionTitle` | 영양성분 DB(식약처) |
| `nutritionDbSectionHint` | 내 기록·템플릿과 별개 |
| `nutritionDbEmpty` | 검색 결과 없음 |
| `nutritionDbError` | 불러오지 못했어요. 다시 시도해 주세요 |
| `nutritionDbSource` | 식품의약품안전처 식품영양성분 DB 기반(일부) |
| `nutritionDbLockedHint` | 영양을 직접 수정했어요. 그램을 바꿔도 자동 재계산하지 않아요 |
| `nutritionDbGramsLabel` | 섭취량 (g) |
| `nutritionDbQTooLong` | 검색어는 60자까지 |
| `nutritionDbGramsInvalid` | 섭취량은 1~5000g |
| `nutritionDbListPortionHint` | 목록 분량은 배수예요. 그램을 바꾸려면 다시 편집하세요 |
| `nutritionDbScaleInvalid` | 영양 값을 계산할 수 없어요. 그램을 확인해 주세요 |
| `nutritionDbNameTooLong` | 음식명은 120자까지 |

## 14) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-20 | 초안. D-1~D-7 |
| 0.2 | 2026-07-21 | 충돌·누락 보완: D-8/D-9, §6.1 grams 필수, 1인분 UX 분리, 반올림·출처·빈 q·q60·잠금 4종·AC-11~15, state-mapping 교차 |
| 0.3 | 2026-07-21 | §5.7 엣지·에러 매트릭스, AC-16~33, 서버 grams 미검증 Out 명시, OCR↔NF·race·401·연타 |
| 0.3+승인 | 2026-07-21 | HUMAN 승인. D-1~D-9 확정. 디자인 승인 후 구현 |
| 0.3+디자인 | 2026-07-21 | 디자인 HUMAN 승인(=구현 착수). 모바일 구현·ATDD GREEN |
