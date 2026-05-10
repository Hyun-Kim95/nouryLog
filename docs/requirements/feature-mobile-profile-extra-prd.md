---
type: prd
project: dietManagement
status: draft
owner: product
parent: docs/requirements/feature-diet-management-app-prd.md
related:
  - docs/requirements/feature-mobile-onboarding-prd.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
updated_at: 2026-05-09
tags: [requirements, prd, mobile-app, profile, recommendation]
---

# 모바일 프로필 확장(활동량·목표) 미니 PRD (v0.1 draft)

## 0) 문서 위치

본 문서는 모체 PRD `feature-diet-management-app-prd.md`의 §6.1·§9·§10을 보강하고, 직전 미니 PRD `feature-mobile-onboarding-prd.md` v0.1의 §10 비범위였던 "활동량·목표 입력"을 v1.3 범위로 정식화한다. 화면 디자인 SSOT는 Stitch 폴리시드 화면 `fd8994c143c84e6b89d98bbad6ffad35`(키 `APP_ONBOARD`, 활동량/목표 라디오 영역) + 신규 `ProfileEdit` 화면 디자인 스펙 `docs/design/mobile-profile-extra-spec.md`.

## 1) 목적

- 사용자가 활동량·목표를 입력하면, 시스템은 BMR(미플린-세인트 지오어)·TDEE·목표 가감을 반영한 더 정확한 권장 칼로리·단백질을 제공한다.
- 사용자가 첫 진입 이후에도 설정에서 입력값을 수정할 수 있도록 ProfileEdit 화면을 제공한다.
- 기존 사용자의 데이터를 임의로 채우지 않고, 미입력 상태에서도 안전한 임시 기본값으로 권장량을 계산한다.

## 2) 적용 범위

- 대상: 모바일 앱 일반 사용자(`role === 'USER'`).
- 포함:
  1. Onboarding 화면(`APP_ONBOARD`)에 활동량 라디오(4) + 목표 라디오(3) 슬롯 추가.
  2. 신규 모바일 화면 `ProfileEdit`(설정 진입점, 7 필드 모두 편집).
  3. 백엔드 `Profile.activityLevel`·`Profile.goal` 컬럼 추가(NULL 허용) + `PUT /me/profile` enum 검증 + 권장 계산 로직 교체 + API 계약 v1.3 changelog.
- 제외:
  - 사용자 다크모드 토글(직전 PRD §10 비범위 유지).
  - 단위 변환(cm↔ft, kg↔lb).
  - 권장 계산식 의학 자문/문헌 인용 보강(v1.4 이상 후속).
  - 식사·통계·OCR·과금.

## 3) 사용자 흐름

### 3.1 Onboarding(첫 진입)
1. 기존 4 필드(성별·나이·신장·체중) 아래에 활동량·목표 라디오 2 슬롯 노출.
2. 활동량·목표는 **선택 사항**(미입력 가능). 미입력 시 서버는 권장 계산에서 임시 기본값 `moderate`/`maintain`을 사용하고, 사용자에게는 "입력 시 더 정확해집니다." 보조 카피로 안내.
3. "다음" 클릭 → `PUT /me/profile`로 저장(미선택 필드는 전송 생략) → 자동 recalc → Main 이동.
4. "나중에 설정"은 기존 동작 유지(트리거 재함입).

### 3.2 ProfileEdit(설정에서 진입)
1. 사용자는 Main → Settings(또는 Subscription 탭의 보조 메뉴, D 결정 시점에는 Subscription 탭의 상단 카드 "프로필 편집"으로 진입; 추후 별도 Settings 탭 신설 시 이전) → "프로필 편집" 진입.
2. `GET /me/profile`로 현재 값을 prefill.
3. 7 필드(성별·나이·신장·체중·활동량·목표 + 선택적으로 권장량 직접 오버라이드 칸 2개) 편집 가능.
4. "저장" → `PUT /me/profile` → 자동 recalc → 토스트 "저장했어요" → 이전 화면으로 복귀.
5. "취소" → 변경 미반영 + 이전 화면 복귀(변경 감지 시 확인 다이얼로그).

> v1.3에서는 권장량 직접 오버라이드 칸은 **비활성**(읽기 전용)으로 두고 v1.4 후속에서 노출 결정. 사용자 결정 D에서 별도 명시되지 않았으므로 본 문서에서 비범위로 둔다.

## 4) 결정 사항 (HUMAN 합의 2026-05-09)

| ID | 항목 | 결정 |
|---|---|---|
| D1 | 권장 칼로리 식 | **미플린-세인트 지오어 BMR × 활동 계수 × 목표 가감** |
| D2 | 활동량 enum/계수 | `sedentary` 1.2 / `light` 1.375 / `moderate` 1.55 / `active` 1.725 (라벨: 거의 없음·가벼움·보통·활동적) |
| D3 | 목표 enum/가감 | `lose` −10% / `maintain` 0% / `gain` +10% (라벨: 감량·유지·증량) |
| D4 | 단백질 식 | `lose` 1.4 g/kg · `maintain` 1.0 g/kg · `gain` 1.6 g/kg(activityLevel 무관, MVP 단순화) |
| D5 | 범위 | Onboarding 슬롯 + ProfileEdit 화면 동시 도입 |
| D6 | 마이그레이션 default | DB 컬럼 NULL 허용 + 권장 계산 시 임시 안전 기본값 `moderate`/`maintain` 사용 |
| D7 | 디자인안 | Stitch 단일안 SSOT(직전 APP_ONBOARD와 동일 사유, 작은 범위 예외) |

## 5) 화면 / 입력 필드 (보강)

### 5.1 새 enum 필드

| 필드 | enum 값 | UI 라벨 | API 매핑 |
|---|---|---|---|
| 활동량 | `sedentary` / `light` / `moderate` / `active` | 거의 없음 / 가벼움 / 보통 / 활동적 | `activityLevel` (nullable) |
| 목표 | `lose` / `maintain` / `gain` | 감량 / 유지 / 증량 | `goal` (nullable) |

각 옵션에 1줄 보조 카피:
- `sedentary` "거의 앉아서 생활"
- `light` "가벼운 산책·집안일"
- `moderate` "주 3~4회 운동"
- `active` "주 5회 이상 강한 운동"
- `lose` "현재 체중 대비 −10%"
- `maintain` "현재 체중 유지"
- `gain` "현재 체중 대비 +10%"

### 5.2 검증

- 두 필드 모두 **선택 사항(미입력 허용)**. 입력 시에는 enum 값만 허용.
- 위반 시 `422 VALIDATION_FAILED` + `details = { field: 'activityLevel' | 'goal', allowed: [...] }`.

### 5.3 카피

- Onboarding 보조 안내(라디오 그룹 위): "입력 시 더 정확한 권장량을 계산해 드려요."
- ProfileEdit 화면 제목: "프로필 편집"
- 저장 성공 토스트: "프로필을 저장했어요. 권장량을 다시 계산했습니다."

## 6) 권장 계산 로직 (v1.3)

### 6.1 BMR (미플린-세인트 지오어)

| 성별 | 식 |
|---|---|
| `male` | `BMR = 10*weightKg + 6.25*heightCm − 5*age + 5` |
| `female` | `BMR = 10*weightKg + 6.25*heightCm − 5*age − 161` |
| `unspecified` | `BMR = 10*weightKg + 6.25*heightCm − 5*age − 78` (남·여 평균) |

### 6.2 TDEE 와 칼로리 목표

```
activityFactor = activityLevel ? coef[activityLevel] : 1.55  // 안전 기본값 moderate
TDEE = BMR × activityFactor
goalFactor = goal ? { lose: 0.9, maintain: 1.0, gain: 1.1 }[goal] : 1.0  // 안전 기본값 maintain
calorieGoalKcal = round(TDEE × goalFactor)
```

### 6.3 단백질 목표

```
proteinPerKg = goal ? { lose: 1.4, maintain: 1.0, gain: 1.6 }[goal] : 1.0
proteinGoalG = round(weightKg × proteinPerKg)
```

### 6.4 트리거

- `POST /me/recommendation/recalculate` 호출 시 위 식으로 다시 계산하고 Profile 컬럼을 갱신.
- `PUT /me/profile` 자체는 권장량을 자동 갱신하지 않는다(현 동작 유지). 클라이언트가 저장 직후 recalc를 명시 호출(직전 PRD §3 흐름 그대로).

## 7) 트리거 / 라우팅

- Onboarding 트리거는 v1.2 그대로(SecureStore `dm_onboarding_done`).
- ProfileEdit는 Main 탭 안에서 진입한다. v1.3 MVP 진입 경로:
  - **Subscription 탭의 상단 "내 프로필" 카드 → "프로필 편집"** (기존 탭 4개를 유지하며 추가 탭 없이 진입점만 확보).
  - 추후 별도 Settings 탭 도입 시 이전.
- ProfileEdit는 RootStack에 Modal 또는 push로 노출(D 결정 — 디자인 스펙에서 push로 채택).

## 8) 상태 처리(5상태) / 에러 매핑

직전 PRD와 동일하게 5상태 적용. 신규 enum 필드의 422는 인라인(라디오 그룹 아래)로 매핑.

| 상태 | Onboarding | ProfileEdit |
|---|---|---|
| 기본 | 입력 활성, "다음" 비활성(필수 4 필드 유효성 미충족) | "저장" 활성(현재 값과 다른 경우만) |
| 로딩 | "다음" 스피너 + 입력 비활성 | "저장" 스피너 + 입력 비활성 |
| 검증 오류 | 라디오 그룹 아래 인라인 빨간 메시지 | 동일 |
| 통신 오류 | 상단 빨간 배너 + 다시 시도 | 동일 |
| 완료 | 토스트 + Main 이동 | 토스트 + 이전 화면 복귀 |
| 권한 제한 | N/A | 401/403 시 Login으로 reset(`clearTokens`) |

## 9) API 계약 영향(v1.3)

상세 changelog는 `feature-diet-management-api-contract-v1.md` v1.3 절.

| 엔드포인트 | 변경 |
|---|---|
| `GET /me/profile` | 응답에 `activityLevel?` / `goal?` 추가 (둘 다 nullable) |
| `PUT /me/profile` | 본문에 `activityLevel?` / `goal?` 허용. enum 검증 강화(`details.field` + `allowed`) |
| `POST /me/recommendation/recalculate` | 내부 식 교체(§6). 응답 필드 `proteinGoalG`/`calorieGoalKcal`는 동일 |

### PUT 본문 의미론(중요)

라디오 재탭으로 미선택으로 돌아가는 UX(§3·§5)를 지원하기 위해 `activityLevel`/`goal`은 다음 세 상태를 구분한다.

| 본문 표현 | 서버 동작 |
|---|---|
| 키 자체를 보내지 않음(JSON undefined) | 변경 없음(기존 값 유지) |
| `activityLevel: null` 또는 `goal: null` 명시 | NULL set(명시적 clear) |
| enum 값(`'moderate'` 등) | 해당 값으로 set |

`gender`는 NOT NULL이라 `null`이 422를 반환한다. 이 분기는 dev smoke `scripts/stitch/out/profile-v13.mjs`의 `null clears` 케이스로 검증.

## 10) 비범위 / 후속 PRD

- 사용자 다크모드 토글.
- 권장 계산 의학 자문 보강(v1.4).
- 권장량 사용자 직접 오버라이드 UI 노출(현재는 컬럼만 존재, ProfileEdit에서 비노출).
- ProfileEdit 진입을 위한 별도 Settings 탭 신설.
- 단위 변환.

## 11) 마이그레이션 정책

- 컬럼: `Profile.activityLevel String?`, `Profile.goal String?` (둘 다 nullable, no default).
- 기존 row 영향: **없음**(NULL 그대로).
- 권장 계산은 NULL일 때 §6.2·§6.3의 안전 기본값(`moderate`/`maintain`)을 적용.
- 롤백: 컬럼 drop 또는 마이그레이션 down. 현 운영 데이터가 NULL이라 회귀 영향 0.

## 12) 변경 이력

- 2026-05-09 (v0.1 draft): 초안 작성. HUMAN 합의 7항목(D1~D7) 반영. b1.
- 2026-05-09 (v0.1.1): §9에 PUT 본문 의미론(undefined / null / enum) 표 추가. b6 검증에서 발견한 갭(null=clear) 반영.
