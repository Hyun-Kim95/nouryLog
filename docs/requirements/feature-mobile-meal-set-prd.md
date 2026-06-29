---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-06-29
approved_at: 2026-06-29
tags: [requirements, prd, mobile-app, meal-set]
---

# 모바일 끼니 세트(즐겨찾기 묶음) PRD

> Gate 1 승인: 2026-06-29 (HUMAN). 디자인 산출물 승인은 별도(§15). 구현 착수는 디자인 승인 + Gate 2(API 계약 고정) 충족 후.

## 1) 문서 목적
- 사용자가 자주 먹는 음식 조합을 **끼니 단위 묶음(세트)** 으로 저장해 두고, 한 번의 동작으로 여러 음식을 동시에 기록하는 기능의 범위·정책·예외·수용 기준을 정의한다.
- 모체 PRD(`feature-diet-management-app-prd.md`)의 `6.1 음식 기록`을 확장하며, **모바일 앱 전용** 범위로 한정한다.
- 구현 착수 전 Gate 1(신규 기능) 충족 수준으로 정리한다.

## 2) 배경 / 문제
- 현재 식사 기록은 `POST /meals`로 **1건씩** 생성한다. (수동 입력 또는 음식 템플릿 기반)
- 비슷한 끼니(예: 매일 아침 "계란2 + 토스트1 + 우유1")를 반복 등록할 때 같은 입력을 매번 여러 번 반복해야 한다.
- 기존에 단일 음식 재사용은 `FoodTemplate` + 입력 추천(`/me/meal-entry-suggestions`)으로 일부 해결되어 있으나, **여러 음식을 묶어 한 번에** 기록하는 수단은 없다.

## 3) 제품 목표
- 반복 식사 기록에 드는 입력 횟수를 줄인다(여러 음식 → 1회 동작).
- 사용자가 자신의 식사 패턴을 **명시적으로 저장·관리**할 수 있게 한다.

## 4) 대상 사용자
- 식단을 규칙적으로 기록하며 비슷한 끼니 구성을 반복하는 일반 사용자(모바일 앱).

## 5) 핵심 사용자 시나리오
1. 사용자가 "아침 기본 세트"라는 이름으로 자주 먹는 음식 3개를 묶어 저장한다.
2. 다음 날 아침, 세트 목록에서 "아침 기본 세트"를 골라 **한 번에 등록**한다(오늘 날짜·아침 끼니로 3건 생성).
3. 사용자가 세트에 음식을 추가/삭제하거나 항목별 분량을 수정한다.
4. 사용자가 더 이상 쓰지 않는 세트를 비활성화(삭제)한다.
5. 등록 직전, 세트 안의 비활성화된 음식 템플릿이 있으면 안내를 받고 처리(해당 항목 제외 또는 취소)를 선택한다.

## 6) 범위 정의

### 6.1 MVP 범위 (핵심)
- 끼니 세트 **생성/조회/수정/비활성화**(soft delete, 모체 PRD 7.1 정책 준수).
- 세트는 **이름 + 기본 끼니(mealSlot) + 항목 목록**을 가진다.
- 세트 항목(`MealSetItem`)은 **템플릿 항목만** 지원한다(D2 결정).
  - **템플릿 항목**: `FoodTemplate` 참조 + 입력 모드(`PORTION_COUNT`/`TOTAL_GRAMS`) + 분량
  - (수동 항목은 후순위 — §6.2)
- 세트 **한 번에 등록(apply)**: 선택 세트의 전체 항목을 지정한 날짜·끼니로 식사 기록 일괄 생성.
- 등록 시 **기본 끼니 override** 허용(예: 아침 세트를 점심으로 등록).
- 진입점: **기록(Log) 화면**의 "세트로 등록" 진입(D1 결정).
- 상태 UI: 세트 없음(빈), 로딩, 오류, 부분 불가(비활성 템플릿 포함), 권한 제한.

### 6.2 후순위 범위 (선택)
> **변경(2026-06-29, HUMAN 승인):** 아래 두 항목은 "과거 기록에서 세트 구성" UX 도입에 따라 **범위로 승격**되어 구현됨(API 계약 v1.7). 데이터 모델 변경은 없음(`kind` 분기 활성화).
- **수동(manual) 항목**(템플릿에 없는 음식명 + 영양 4종 + 그램 스냅샷) 지원 — **구현 완료(v1.7)**.
- 지난 끼니를 그대로 복제해 세트로 저장(과거 식사 → 세트 변환) — 앱 "최근 먹은 기록" 소스로 **구현**(템플릿 기반 기록→template 항목, 수기 기록→manual 항목).
- 자주 먹은 조합 자동 추천(빈도 기반).
- 세트 공유/추천 마켓.
- 세트별 사진/메모.

### 6.3 비범위 (명시적 제외)
- 관리자 웹 변경 없음(모바일 앱 전용).
- 결제/유료화 연계 없음. (제품 기본 전제: 수익은 광고·후원 수준. 본 기능은 **무료 기능**으로 설계한다.)

## 7) 기능 요구사항

### 7.1 세트 구조
- 세트 필수값: `name`(1~40자), `defaultMealSlot`(BREAKFAST/LUNCH/DINNER/SNACK), 항목 1개 이상.
- `defaultMealSlot === SNACK`이면 `defaultSnackPlacement`를 가질 수 있다(없으면 등록 시 기본 placement 사용). `defaultMealSlot !== SNACK`이면 `defaultSnackPlacement`는 `null`로 강제한다(코드 `validateMealSlotSnackCombo` 정합).
- 항목 수 상한: 세트당 **최대 20개**(운영 가드값, 추후 조정 가능). 초과 저장 시도는 `422 VALIDATION_FAILED`로 차단한다.
- 세트 개수 상한: 사용자당 **최대 50개**(활성 기준, 운영 가드값). 초과 생성 시도는 `422 VALIDATION_FAILED`로 차단한다.
- 세트 이름 중복: **허용**한다(같은 이름의 세트를 막지 않는다). 단 동일 이름 생성 시 클라이언트가 식별 가능하도록 목록에 생성일/항목 수를 함께 노출한다.
- 항목 공통: `displayOrder`(정렬), 분량 정보.
  - 템플릿 항목(MVP): `foodTemplateId` + `mealInputMode` + (`portionQuantity` 또는 `totalGrams`).
  - 수동 항목(후순위, §6.2): `name` + `calories`/`protein`/`carbohydrate`/`fat` + `grams`. 데이터 모델은 `kind` 분기로 확장 가능하게 두되 MVP API/화면에는 노출하지 않는다.
- 음식 기록 입력 검증은 모체 PRD 6.1을 따른다(음수 불가, 비정상 대형값 경고).
  - **비정상 대형값 경고는 항목(단일 끼니) 단위로 판단**한다(모체 6.1 "단일 끼니 10,000kcal 초과" 기준과 정합). 세트 전체 칼로리 합계가 아니라 개별 항목 기준으로 경고한다.

### 7.2 세트 등록(apply) 정책
- 입력: `consumedAt`(대상 날짜·시각, 기본=현재), `mealSlot`(override, 기본=세트 `defaultMealSlot`), `snackPlacement`(SNACK일 때), `excludeItemIds`(사전 검증에서 제외하기로 한 항목).
- **일자 경계/타임존**: `consumedAt` 미지정 시 서버는 현재 시각을 사용하고, 클라이언트의 "오늘" 판정은 모체 PRD 6.3과 동일하게 **KST(`Asia/Seoul`) 00:00 일자 경계**(`todayAnchorKst` 등)를 따른다. 과거 날짜 등록은 기존 `PastMealBrowse` 흐름과 동일한 날짜 의미를 사용한다.
- 처리: (제외 항목을 뺀) 세트의 **등록 대상 항목**을 개별 `Meal` 레코드로 생성한다.
  - 템플릿 항목은 등록 시점 템플릿의 영양값으로 환산(기존 `POST /meals` 템플릿 환산 로직 재사용).
  - 수동 항목은 저장된 스냅샷 값으로 생성.
  - 생성되는 모든 meal의 `mealSlot`/`snackPlacement`/`consumedAt`은 등록 입력값을 따른다.
- **슬롯/간식 조합 규칙**: `mealSlot` override 결과가 SNACK이 아니면 `snackPlacement`는 무시·`null` 처리한다. SNACK인데 `snackPlacement`가 없으면 기존 `snackPlacementForCreate` 기본값 로직을 따른다(코드 `validateMealSlotSnackCombo`와 정합).
- **원자성(기본 정책)**: 등록은 **등록 대상 항목 전체에 대해 전체 성공 또는 전체 실패(단일 트랜잭션)** 로 처리한다. `excludeItemIds`로 의도적으로 제외한 항목은 처음부터 등록 대상이 아니며(부분 실패가 아님), 나머지 대상 항목은 원자적으로 처리된다. 등록 대상 중 하나라도 저장 실패 시 전체 롤백한다.
- **사전 검증**: 등록 실행 전 비활성 템플릿 등 문제 항목을 먼저 검사해 사용자에게 노출한다(`409 MEAL_SET_ITEM_UNAVAILABLE`). 사용자는 `문제 항목 제외 후 등록`(해당 항목을 `excludeItemIds`에 담아 재요청) 또는 `취소`를 선택한다.
- **멱등성**: 클라이언트가 `clientRequestId`(배치 단위 UUID)를 보내고, 서버는 항목별 멱등 키를 파생(`{clientRequestId}:{itemId}`)해 `Meal.clientRequestId`에 사용한다(`@@unique([userId, clientRequestId])` 정합). 동일 배치 재전송 시 중복 생성하지 않고 기존 결과를 반환한다.
  - **의도적 재등록**(같은 끼니를 다시 먹어 다시 기록)은 **새 `clientRequestId`** 로 요청해야 하며, 이는 중복이 아니라 정상 신규 등록이다.

### 7.3 등록 불가 항목 / 사전 검증
- apply 사전 검증은 아래 "등록 불가" 조건을 항목별로 검사해 `409 MEAL_SET_ITEM_UNAVAILABLE`(`details`에 항목 ID·사유)로 안내한다.
  - (a) 템플릿 항목의 `FoodTemplate`가 **비활성화**됨(모체 PRD 7.1 정합) — 신규 등록 불가.
  - (b) 템플릿 항목의 `foodTemplateId`가 **null**(템플릿이 purge되어 `onDelete: SetNull` 발생) — 참조 소실로 등록 불가.
  - (c) 템플릿의 `portionUnit`/`referenceAmount`/영양 필드가 변경되어 저장된 분량(`portionQuantity`/`totalGrams`)으로 **환산 불가**(기존 "템플릿 기준 분량이 올바르지 않습니다" 검증과 정합).
- 사용자는 **`문제 항목 제외 후 등록`(기본 강조 CTA, 해당 항목 `excludeItemIds`)** 또는 `취소`(보조)를 선택한다(D3 결정).
- 세트 자체는 유지되며, 사용자가 항목을 교체/삭제할 수 있다. 편집 화면은 (a)~(c) 항목에 경고 표시를 노출한다.

### 7.4 세트 관리
- 세트 목록: 사용자 본인 세트만 조회(활성 기본, 비활성 제외).
- 수정: 이름/기본 끼니/항목 추가·삭제·순서·분량 변경.
- 비활성화: soft delete. 이미 등록된 과거 식사 기록에는 영향 없음.
- 편집 중 항목 템플릿이 그 사이 비활성화된 경우, 편집 화면에서 해당 항목에 비활성 표시를 노출하고 교체/삭제를 유도한다(저장 자체는 막지 않으나, 등록 시 §7.3 사전 검증으로 처리).

### 7.5 데이터/정책 정합 (모체 PRD 7장 연계)
- **소유권**: 모든 세트는 `userId`에 종속된다. 타인 소유 또는 존재하지 않는 세트 접근은 `404 NOT_FOUND`로 처리한다(존재 여부 노출 방지를 위해 403 대신 404로 통일).
- **soft delete / purge**: `MealSet`/`MealSetItem`은 모체 PRD 7.1의 soft delete 대상에 준한다. 비활성화 후 `deactivatedAt + 1년` 도달 시 기존 purge 배치 대상에 포함한다. 단, 세트로 **생성된 `Meal` 기록은 별개 엔티티**로 자체 정책(7.1)을 따른다(세트 삭제가 과거 기록을 지우지 않음).
- **개인정보**: 세트/항목은 신장·체중·나이 등 민감 개인정보를 저장하지 않는다(음식 구성·영양값만). 별도 컬럼 암호화 대상 아님.
- **감사 로그**: 사용자 본인 자원에 대한 CRUD이므로 관리자 감사 로그(모체 7.2) 대상이 아니다.
- **마이그레이션/백필**: 신규 테이블(`MealSet`, `MealSetItem`) 추가만 있고 기존 `Meal`/`FoodTemplate` 스키마 변경·데이터 백필은 없다.
- **통계 연계**: apply로 생성된 `Meal`은 일반 식사 기록과 동일하게 일 배치 집계 대상이며, 통계 신선도(`isStale`)도 동일 규칙을 따른다(별도 처리 없음).

## 8) 화면 스펙 (모바일, 초안)

> 기존 앱 패턴(카드/리스트 중심, 바텀시트 모달, `ScreenLayout`, `Field`/`Segmented`/`PrimaryButton`, `useTheme` 토큰, 다크모드) 재사용.

### 8.1 세트 목록 화면 (MealSetList)
- 진입: **기록(Log) 화면**의 "세트로 등록" 진입점(D1 결정).
- 구성: 세트 카드 리스트(이름, 기본 끼니 뱃지, 항목 수, 대표 칼로리 합), "새 세트" CTA.
- 상태: 기본(리스트), 로딩(스켈레톤), 빈(생성 유도 CTA), 오류(재시도), 권한 제한.

### 8.2 세트 편집 화면/모달 (MealSetEditor)
- 이름 입력, 기본 끼니(Segmented), 항목 목록(추가/삭제/순서/분량).
- 항목 추가(MVP): 기존 입력 추천(`/me/meal-entry-suggestions`)의 **템플릿 결과**를 재사용해 검색 → 분량 지정. (수동 직접 입력은 후순위, §6.2)
- 상태: 기본, 저장 중(버튼 비활성), 오류(필드/토스트), 검증 오류(빈 이름/항목 0개).

### 8.3 한 번에 등록 시트 (MealSetApplySheet)
- 진입: 세트 카드의 "등록" 또는 Log 화면.
- 구성: 대상 날짜/끼니(override) 선택, 등록될 항목 미리보기(영양 합계), "등록" CTA.
- 상태: 기본, 등록 중, 성공(토스트 + Log 갱신), 부분 불가(비활성 항목 안내 + 제외/취소), 오류(재시도).
- 키보드 회피: 입력 포함 바텀시트는 `KeyboardAvoidingView` 적용(기존 컨벤션).

## 8b) 엣지케이스/에러 처리 기준 (필수)

> 모체 PRD 8.1을 본 기능 맥락으로 구체화한다. 공통 항목은 모체 8.1을 상속한다.

### 8b.1 네트워크/타임아웃/중복 제출
- apply/CRUD 요청 중 버튼을 비활성화해 중복 제출을 막는다.
- apply 5xx/타임아웃 시 **동일 `clientRequestId`로 재시도**한다. 서버가 이미 커밋했으면 멱등 처리로 동일 `createdMealIds`를 반환한다(중복 생성 없음). **새 `clientRequestId`로 재시도하지 않는다.**
- 오프라인 상태에서는 등록을 큐잉하지 않고 오류 + 재시도 안내만 노출한다(오프라인 큐는 비범위).

### 8b.2 멱등/트랜잭션 경합
- apply 트랜잭션 내에서 파생 멱등 키(`{clientRequestId}:{itemId}`)가 이미 존재하면(직전 시도 부분 커밋·재시도) **유니크 충돌을 오류로 보지 않고** 기존 생성분을 결과에 포함해 반환한다.
- 동일 세트를 두 기기에서 **서로 다른 `clientRequestId`로 동시에** 등록하면 각각 정상 신규 등록으로 처리한다(둘 다 의도된 기록).

### 8b.3 세트 내용 변경 경합 (apply 시점 스냅샷)
- apply는 **요청 처리 시점의 세트 항목**을 기준으로 동작한다. 등록 직전에 다른 기기에서 세트가 수정/비활성화됐다면:
  - 세트가 비활성화됨 → `404 NOT_FOUND`.
  - 항목이 바뀜 → 변경된 현재 항목으로 사전 검증·등록.
- 템플릿 항목은 **등록 시점 템플릿의 최신 영양값**을 반영한다(수동 항목은 저장된 스냅샷 고정). 이 정책을 등록 미리보기 합계 계산에도 동일 적용한다.

### 8b.4 입력값/경계
- `consumedAt` 날짜: 과거/오늘 등록은 허용한다. **미래 일자**는 차단(`422 VALIDATION_FAILED`)한다(D5 결정).
- `name` 공백만 입력 → trim 후 1~40자 검증, 미달 시 422.
- 수동 항목 영양 필드 누락/음수 → 필드 단위 422.
- 항목 분량/그램 과대 입력 → 항목 단위 비정상 대형값 경고(§7.1).
- `mealSlot`/`snackPlacement` enum 불일치 → 422. 비-SNACK인데 placement 전달 시 무시·`null` 처리(AC-13).

### 8b.5 인증/권한
- 401: 1회 자동 재발급 후 재요청, 실패 시 로그인 이동.
- 본인 소유 아님/없음: `404 NOT_FOUND`(존재 노출 방지).
- 비활성 회원은 인증 단계에서 차단(모체 7.1).

### 8b.6 캐시/상태 일관성
- apply 성공 후 Log/홈 요약 등 식사 기록 관련 화면 캐시를 무효화·갱신한다(모체 8.1 비활성화 캐시 정책과 동일 취지).
- 세트 생성/수정/비활성화 후 세트 목록 캐시를 갱신한다.
- 통계는 일 배치 반영이므로 등록 직후 통계 화면은 `isStale` 안내가 노출될 수 있다(정상).

### 8b.7 빈/부분 상태
- 사전 검증으로 **모든 항목이 제외**되면 등록 대상 0건 → `422 VALIDATION_FAILED`("등록할 항목이 없어요").
- 세트 항목이 1개여도 정상 등록한다(최소 경계).

## 9) 상태 처리 원칙
- 기본/로딩/빈/오류/완료/권한 제한을 화면별로 정의(모체 PRD 8장 + product-ui-core 준수).
- 등록 결과 메시지는 기존 토스트 패턴(`feature-mobile-toast-prd.md`)을 따른다.
- 다크모드 기본 지원, 라이트/다크 토큰 정합.
- 공통 엣지케이스(네트워크 5xx/타임아웃 재시도, 저장 버튼 요청 중 비활성화, 토큰 만료 1회 자동 재발급)는 모체 PRD 8.1을 따른다.

## 9b) 비기능 요구사항
- 성능 목표: 세트 목록 조회 1초 이내(최근 50개 기준), apply 등록 응답 2초 이내 목표.
- 접근성: 버튼/입력 역할 명확, 텍스트 대비 확보, 아이콘 단독 의미 전달 금지(모체 PRD 9장·product-ui-core 접근성 준수).
- 다크모드 전환 토글은 앱 전역 설정을 상속하며 본 기능에서 별도 토글을 두지 않는다.
- 입력 포함 바텀시트는 `KeyboardAvoidingView`로 키보드 회피(기존 컨벤션).

## 10) API 계약 초안 (요약)

> 기존 `me.ts`(meRouter) 컨벤션, 공통 오류 응답 규약(모체 PRD 10.2: `code`/`message`/`details`/`traceId`) 준수. 신규 계약은 `feature-diet-management-api-contract-v1.md`에 버전 반영 예정.
> 모든 엔드포인트는 인증 필요(401), 본인 자원만 접근(타인/없는 세트=`404 NOT_FOUND`).

### 10.1 세트 CRUD
- `GET /me/meal-sets` → `{ items: MealSet[] }` (활성 기본). 목록은 앱 스크롤 기반(웹 테이블/페이지네이션 규칙 비적용).
- `POST /me/meal-sets` → 생성, body: `{ name, defaultMealSlot, defaultSnackPlacement?, items: MealSetItemInput[] }`. 422: 빈 이름/항목 0개/항목 20개 초과/세트 50개 초과(`VALIDATION_FAILED`).
- `GET /me/meal-sets/{id}` → 단건 상세(항목 포함). 404: 본인 소유 아님/없음.
- `PUT /me/meal-sets/{id}` → 이름/기본 끼니/항목 전체 갱신. 404/422 동일 규칙.
- `PATCH /me/meal-sets/{id}/deactivate` → soft delete(멱등: 이미 비활성도 성공 처리).

### 10.2 세트 등록(apply)
- `POST /me/meal-sets/{id}/apply`
  - body: `{ consumedAt?, mealSlot?, snackPlacement?, clientRequestId, excludeItemIds?: string[] }`
  - 200: `{ createdMealIds: string[], skippedItemIds: string[] }` (`skippedItemIds`는 `excludeItemIds`로 제외된 항목을 에코)
  - 404 `NOT_FOUND`: 본인 소유 아님/없음
  - 422 `VALIDATION_FAILED`: 빈 세트(전 항목 제외 포함)·잘못된 slot/placement 조합
  - 409 `MEAL_SET_ITEM_UNAVAILABLE`: 비활성 템플릿 등 사전 검증 실패(`details`에 문제 항목 ID 목록)
  - 멱등: 동일 `clientRequestId` 재전송 시 중복 생성 없이 기존 `createdMealIds` 반환

### 10.3 타입 초안
```
MealSet = {
  id: string;
  name: string;
  defaultMealSlot: MealSlot;
  defaultSnackPlacement: SnackPlacement | null;
  items: MealSetItem[];
  createdAt: string;
}
MealSetItem =
  | { id; kind: 'template'; foodTemplateId; mealInputMode; portionQuantity?; totalGrams?; displayOrder }   // MVP
  | { id; kind: 'manual'; name; calories; protein; carbohydrate; fat; grams; displayOrder }                // 후순위(§6.2), MVP API/화면 미노출
```
- MVP API 입력(`MealSetItemInput`)은 `kind: 'template'`만 허용한다. `manual`은 후속 버전에서 추가한다.

### 10.4 데이터 모델 초안 (Prisma)
- `MealSet`: `id`, `userId`, `name`, `defaultMealSlot`, `defaultSnackPlacement?`, `active`, `deactivatedAt?`, `createdAt`. 인덱스 `@@index([userId])`.
- `MealSetItem`: `id`, `mealSetId`, `kind`, `displayOrder`, 템플릿/수동 필드(nullable 분리), `foodTemplateId?`(onDelete: SetNull). 인덱스 `@@index([mealSetId])`.
- 기존 `Meal`/`FoodTemplate` 스키마 변경은 없음(추가 모델만).

## 11) 수용 기준 (Acceptance Criteria, ATDD-lite)

- **AC-01** (세트 생성)
  - 대상: `POST /me/meal-sets`
  - Given 로그인 사용자가 이름·기본 끼니·항목 2개를 입력하면
  - When 세트를 저장하면
  - Then 세트가 생성되고 목록 조회에 활성 상태로 노출된다.
  - 상태: 기본/오류(검증 실패=422)

- **AC-02** (빈 항목 검증)
  - 대상: `POST /me/meal-sets`
  - Given 항목이 0개인 세트를
  - When 저장하려 하면
  - Then 422 검증 오류를 반환하고 화면에 항목 1개 이상 안내를 표시한다.
  - 상태: 오류

- **AC-03** (한 번에 등록 — 정상)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 항목 3개인 활성 세트를
  - When 오늘 날짜·아침 끼니로 등록하면
  - Then 3건의 `Meal`이 생성되고 모두 `mealSlot=BREAKFAST`, 동일 `consumedAt` 날짜를 가지며, Log/통계에 반영된다.
  - 상태: 기본/완료

- **AC-04** (원자성 — 전체 실패)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 등록 처리 중 일부 항목 저장이 실패하면
  - When 트랜잭션이 롤백되면
  - Then 어떤 `Meal`도 생성되지 않고 오류를 반환한다(부분 저장 없음).
  - 상태: 오류

- **AC-05** (비활성 템플릿 사전 검증)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 세트 항목 중 비활성화된 템플릿이 포함되면
  - When 등록을 시도하면
  - Then 409와 문제 항목 ID를 반환하고, 사용자는 `제외 후 등록`(excludeItemIds 재요청) 또는 `취소`를 선택한다.
  - 상태: 부분 불가/오류

- **AC-06** (끼니 override)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 기본 끼니가 아침인 세트를
  - When 점심으로 override해 등록하면
  - Then 생성된 모든 `Meal`의 `mealSlot=LUNCH`가 된다.
  - 상태: 기본

- **AC-07** (멱등 등록)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 동일 `clientRequestId`로 같은 등록 요청을 2회 보내면
  - When 두 번째 요청이 처리되면
  - Then 중복 `Meal`이 생성되지 않고 첫 결과의 `createdMealIds`를 반환한다.
  - 상태: 기본(멱등)

- **AC-08** (세트 비활성화 — 과거 기록 보존)
  - 대상: `PATCH /me/meal-sets/{id}/deactivate`
  - Given 이미 등록에 사용된 세트를
  - When 비활성화하면
  - Then 세트는 목록에서 제외되지만, 그 세트로 만든 과거 `Meal` 기록은 유지된다.
  - 상태: 완료/기본

- **AC-09** (빈 상태)
  - 대상: MealSetList 화면
  - Given 세트가 하나도 없으면
  - When 목록 화면에 진입하면
  - Then 빈 상태 안내 + "새 세트" 생성 CTA를 노출한다.
  - 상태: 빈

- **AC-10** (권한/인증)
  - 대상: 모든 `/me/meal-sets*`
  - Given 토큰 만료 사용자가
  - When 호출하면
  - Then 1회 자동 재발급 후 재요청하고, 실패 시 로그인 화면으로 이동한다.
  - 상태: 권한 제한

- **AC-11** (소유권/404)
  - 대상: `GET|PUT|PATCH|POST /me/meal-sets/{id}*`
  - Given 다른 사용자의 세트 ID 또는 존재하지 않는 ID로
  - When 조회/수정/등록을 시도하면
  - Then `404 NOT_FOUND`를 반환하고 타인 자원 존재 여부를 노출하지 않는다.
  - 상태: 오류/권한 제한

- **AC-12** (상한 검증)
  - 대상: `POST|PUT /me/meal-sets`
  - Given 항목 21개 이상이거나 사용자의 활성 세트가 이미 50개인 상태에서
  - When 저장/생성을 시도하면
  - Then `422 VALIDATION_FAILED`를 반환하고 상한 초과 안내를 표시한다.
  - 상태: 오류

- **AC-13** (간식 슬롯 조합 정합)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 기본 끼니가 SNACK이고 `snackPlacement`가 설정된 세트를
  - When `mealSlot=LUNCH`로 override해 등록하면
  - Then 생성된 meal의 `snackPlacement`는 `null`이 된다(비-SNACK 슬롯).
  - 상태: 기본

- **AC-14** (타임아웃 후 멱등 재시도)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given apply 요청이 타임아웃됐지만 서버는 이미 커밋한 상태에서
  - When 클라이언트가 **동일 `clientRequestId`로 재시도**하면
  - Then 중복 `Meal` 생성 없이 기존 `createdMealIds`를 반환한다.
  - 상태: 오류 복구/멱등

- **AC-15** (참조 소실/환산 불가 사전 검증)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given 템플릿이 purge되어 `foodTemplateId=null`이거나 분량 환산이 불가한 항목이 포함되면
  - When 등록을 시도하면
  - Then `409 MEAL_SET_ITEM_UNAVAILABLE`와 해당 항목 ID·사유를 반환한다.
  - 상태: 부분 불가/오류

- **AC-16** (등록 성공 후 캐시 갱신)
  - 대상: MealSetApplySheet → Log/홈
  - Given 세트 등록이 성공하면
  - When 시트가 닫히면
  - Then Log/홈 요약이 새 기록을 반영하도록 갱신된다(스테일 데이터 미노출).
  - 상태: 완료

- **AC-17** (미래 일자 차단)
  - 대상: `POST /me/meal-sets/{id}/apply`
  - Given `consumedAt`이 미래 일자이면
  - When 등록을 시도하면
  - Then `422 VALIDATION_FAILED`를 반환한다(D5 결정: 미래 차단).
  - 상태: 오류

## 12) 결정 완료 항목 (2026-06-29)
- (D1) 세트 진입점: **기록(Log) 화면**의 "세트로 등록" 진입. (설정 탭 진입은 비범위)
- (D2) ~~MVP는 템플릿 항목만 지원~~ → **개정(2026-06-29):** 템플릿 + **수기(manual) 항목** 모두 지원(API v1.7). "과거 기록에서 선택"으로 세트를 구성할 때 수기 식사도 담을 수 있도록 함.
- (D3) 비활성/등록 불가 항목 포함 시 기본 CTA = **"문제 항목 제외 후 등록"**(강조), 보조로 "취소".
- (D4) 항목 상한 20개 / 사용자당 활성 세트 상한 50개 **유지**(운영 데이터 기반 추후 조정 여지).
- (D5) `consumedAt` 미래 일자 = **차단**(`422 VALIDATION_FAILED`). 과거/오늘만 허용.

### 잔여 미확정 (디자인 단계에서 확정)
- 없음(핵심 정책 확정). 화면 세부(카드 레이아웃, 항목 미리보기 표현)는 디자인 산출물에서 확정한다.

## 13) 구현 트랙 제안 (Gate 2 전 사전 계획)
- Track A (Backend): `MealSet`/`MealSetItem` 스키마 + 마이그레이션, 세트 CRUD + apply(트랜잭션·사전 검증·멱등) API.
- Track B (Frontend App): 세트 목록/편집 화면 + 한 번에 등록 시트 + Log 연동, 상태 UI.
- Track C (Design): 3개 화면 상태 스펙·다크모드 토큰 정합(디자인 게이트 산출물).
- 병렬 조건: 디자인 승인 + API 계약(10장) 고정 후 A/B 병렬 착수. 통합 책임은 메인 에이전트.

## 14) 성공 지표 (초안)
- 세트 1개 이상 보유 사용자 비율.
- 세트 등록(apply)으로 생성된 식사 기록 비율.
- 세트 사용자 vs 비사용자의 주간 기록 작성 빈도 차이.

## 15) 디자인 승인 상태
- **승인 완료(2026-06-29, HUMAN).** 이중 디자인안(안 A 로컬 목업 / 안 B Stitch)을 동시 제시 후 **안 A를 기준 시안으로 채택**. 시각 디테일은 안 B 참조.
- 디자인 산출물·비교표·선택 기록: [`docs/design/meal-set-dual-design.md`](../design/meal-set-dual-design.md).
- 디자인 승인 = 구현 착수 승인(`70-client-lifecycle-default`). 별도 구현 착수 승인은 요구하지 않으며, Gate 2(API 계약 고정 + ATDD-lite RED) 후 구현에 착수한다.
- 반응형 기준: 모바일 **단일 폭(세로) 기준**으로 설계하며, 태블릿/가로 전용 레이아웃은 비범위로 명시한다(`65-design-gate`의 반응형 항목을 본 정책으로 충족).
- 이중 목업: `67-dual-design-exemption` 면제 대상 아님(신규 화면/라우트 다수) → 이중 안 작성·선택 완료.
