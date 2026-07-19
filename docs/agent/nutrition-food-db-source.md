---
type: doc
project: dietManagement
doc_lane: agent
updated_at: 2026-07-19
tags: [nutrition, mfds, k-find, attribution, import]
---

# NutritionFood — 출처·import 메모

PRD: [`docs/requirements/feature-nutrition-food-db-prd.md`](../requirements/feature-nutrition-food-db-prd.md) (v0.4)  
계약: [`docs/requirements/api-contract-v1.17-nutrition-food-db-delta.md`](../requirements/api-contract-v1.17-nutrition-food-db-delta.md)

## 출처 (D-1)

- **1차 소스:** 식품의약품안전처 식품영양성분 데이터베이스(K-FIND) 공개 자료
  - 내려받기: [영양성분 DB 내려받기](https://various.foodsafetykorea.go.kr/nutrient/general/down/list.do)
  - 통합·표준 데이터: [공공데이터포털](https://www.data.go.kr) 「전국통합식품영양성분정보」 등 (제공기관: 식약처 등)
- **미사용(1차):** USDA FDC, 실시간 Open API 전용 의존

이용 시 **출처 표시** 등 해당 데이터셋의 공공누리/이용조건을 준수한다.  
앱·설정·스토어 문구(후속 UI 공개 시): “식품의약품안전처 식품영양성분 DB 기반(일부)” 정도.  
`privacy.md` 개정은 **개인정보 신규 수집이 없으므로 1차 필수 아님**; UI에 출처를 노출할 때 검토.

## 저장 정책 (D-2·D-3)

- 원본 엑셀/대용량 CSV: **git 커밋 금지**
  - 경로: `apps/server/data/nutrition-food/raw/`
  - `.gitignore`에 등록
- 레포에는 큐레이션 매니페스트 + 정규화 샘플(소수)만 둘 수 있음  
  - 예: `apps/server/data/nutrition-food/manifest/` (커밋 가능)
- 목표 적재: **약 1,000건** (허용 500~2,000), `NutritionFood` 테이블
- `FoodTemplate`에 bulk insert **금지**

## 필드 매핑 (100g)

원본 컬럼명은 다운로드 버전에 따라 다를 수 있다. import 스크립트에서 버전별 매퍼를 둔다.

| 우리 필드 | 의미 | 원본에서 흔히 쓰는 개념 |
|---|---|---|
| `externalId` | 식품코드 | 식품코드 / 코드 |
| `name` | 식품명 | 식품명 |
| `nameNormalized` | 검색키 | NFC + 공백 축소 (+ 라틴 casefold) |
| `category` | 분류 | 식품대분류 등 — **admin 한식/중식 SSOT와 별개** |
| `per100gCalories` | kcal/100g | 에너지(kcal) — **이미 100g 기준인지 확인** |
| `per100gProtein` | g/100g | 단백질 |
| `per100gFat` | g/100g | 지방 |
| `per100gCarbohydrate` | g/100g | 탄수화물 |

원본이 “1회 제공량” 기준이면 **100g로 환산 후** 적재한다. 환산 불가면 해당 행 스킵.

## 환산·반올림

서버 헬퍼는 `per100g * (grams/100)`이며 **반올림 없음**.  
기존 `computeScaledNutritionFromGrams`(servingGrams=100)과 동치.

## 재import

```text
1. K-FIND/공공데이터에서 덤프 다운로드 → raw/ (gitignore)
2. 큐레이션 매니페스트로 대상 코드 필터(또는 수동 선별 CSV)
3. npm run nutrition:import -- --file=... --sourceVersion=YYYY-MM
   (`--sourceVersion` 필수. 누락 시 exit ≠ 0)
4. 리포트: upsert / skip(reason code) / duplicateInFile / committedChunks 확인
5. GET /me/nutrition-foods?q=... 및 GET /admin/nutrition-foods 스모크
```

`(MFDS, externalId)` upsert로 덮어쓴다. `sourceVersion`은 추적 메타.  
**파일에 없는 기존 행은 삭제·비활성화하지 않음.** inactive 행은 `active` 컬럼 미제공 시 재import로 다시 켜지지 않음(PRD §5·계약 §4.1).  
커밋: **100행 청크**; 실패 청크 이전 커밋은 유지.

### 필드 길이 (import 검증)

| 필드 | 한도 |
|---|---|
| `externalId` | 1~64 |
| `name` | 1~120 |
| `category` | ≤50 (초과 truncate + `CATEGORY_TRUNCATED`) |
| `sourceVersion` | 1~40 (CLI 필수) |

### import 실패·스킵 (요약)

PRD §5.1 표가 SSOT. 핵심만:

- 파일 없음 / 파싱 실패 / 유효 행 0 / `sourceVersion` 누락 → **exit ≠ 0**
- 행 단위 불량(빈 코드·음수 매크로·길이 초과 등) → skip + reason code, 다른 행은 진행
- 파일 내 중복 `externalId` → 마지막 행 승
- DB 오류 → 청크 중단, 이전 청크 유지

## FoodTemplate·AI KB와의 관계

| 자산 | 역할 |
|---|---|
| `NutritionFood` | 공개 검색 카탈로그(본 기능) |
| `FoodTemplate` | 관리자 큐레이션 소수·Meal 연동(기존) |
| AI `nutrition_kb` | RAG markdown(deprecated 트랙) — **비연동** |

1차: 자동 동기화·FK 없음. 후속 “템플릿으로 가져오기” 가능.  
CLI import는 모체 PRD 관리자 감사 로그 대상 **아님**(1차).

## 과금

NutritionFood API는 OCR 쿼터·프리미엄·광고 제거와 **무관**. 모체 `6.6`과 충돌 시 본 기능은 결제 미포함 전제를 따른다.
