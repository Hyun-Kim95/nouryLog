---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-10
tags: [requirements, prd, mobile-app, admin-web]
---

# 식단 관리 앱 + 관리자 사이트 PRD (초안)

## 1) 문서 목적
- 음식 섭취 기록/통계/개인화 권장량 기능을 갖춘 모바일 앱과 운영용 관리자 웹의 요구사항을 정의한다.
- 구현 착수 전 범위, 정책, 예외, 미확정 항목을 정리해 Gate 1 충족 수준으로 맞춘다.

## 2) 제품 목표
- 사용자가 음식 섭취를 빠르게 기록하고, 기간별 영양소/칼로리 통계를 확인할 수 있어야 한다.
- 사용자 프로필(성별, 나이, 신장, 체중, 목표, 활동량)을 기반으로 맞춤 권장량을 제공해야 한다.
- 관리자는 회원/음식/문의/공지/운영 통계를 한 곳에서 관리할 수 있어야 한다.

## 3) 대상 사용자
- 일반 사용자: 식단 기록, 목표 관리, 통계 확인이 필요한 개인.
- 운영 관리자: 콘텐츠/회원/문의 운영이 필요한 내부 운영자.

## 4) 핵심 사용자 시나리오
1. 사용자가 음식 사진을 올리고 섭취량을 입력해 한 끼 기록을 저장한다.
2. 사용자가 오늘/이번 주/이번 달 섭취 통계를 본다.
3. 사용자가 프로필을 입력하면 시스템이 권장 단백질/칼로리 기준을 제안한다.
4. 사용자가 자동 입력 결과를 검토하고 수동으로 수정한다.
5. 관리자가 음식 템플릿(예: 계란, 김치)을 등록/비활성화한다.
6. 관리자가 회원을 비활성화하고, 정책에 따라 1년 뒤 완전 삭제된다.

## 5) 범위 정의

### 5.1 MVP 범위 (핵심)
- 모바일 앱
  - 회원가입/로그인
  - 음식 기록 생성/조회/수정 (삭제는 비활성화)
  - 음식 사진 등록
  - 수동 영양정보 입력(칼로리, 탄수화물, 단백질, 지방)
  - 영양정보 사진 OCR 자동입력 + 사용자 검수/수정
  - 통계: 한 끼/하루/주/월 집계
  - 프로필 기반 권장 단백질량 제안
  - 권장량 수동 오버라이드(사용자 직접 설정)
  - OCR 영양정보 자동입력 무료 사용량(회원별 5회) 제공
  - 무료 사용량 초과 시 OCR 기능 유료 결제 후 사용 가능
  - 앱 하단 광고 노출 및 광고 제거 유료 옵션 제공
- 관리자 웹
  - 로그인/권한 관리(관리자 전용)
  - 대시보드
  - 회원관리(조회, 비활성화)
  - 음식관리(템플릿 등록/수정/비활성화)
  - 통계관리(사용량/활성 추세)
  - 문의관리(조회, 처리상태 변경)
  - 공지관리(작성, 게시, 비활성화)

### 5.2 후순위 범위 (선택)
- 바코드 인식
- 다국어 OCR 고도화
- 영양 목표 자동 주간 코칭 문구
- 외부 웨어러블 연동

## 6) 기능 요구사항

### 6.1 음식 기록
- 음식 단위: `음식 템플릿` 또는 `사용자 직접 입력`.
- 기록 필수값: 섭취 시각, 음식명, 섭취량(그램 또는 1회 제공량 기준), 영양소 4종.
- 계산 정책: 섭취량 비율로 탄/단/지/칼로리 자동 환산.
- 수정 이력: 최근 변경 시각은 보관.
- 입력 검증:
  - 섭취량/영양소 값은 0 미만 입력 불가.
  - 비정상적으로 큰 값(예: 단일 끼니 10,000kcal 초과)은 저장 전 확인 경고를 노출한다.

### 6.1.1 사용자 인증 (모바일 SNS / 관리자 이메일)
- **모바일** 사용자 로그인·가입 진입은 **SNS 전용**(`naver`, `google`, `kakao`)이다. 앱 UI에 이메일/비밀번호 로그인·이메일 회원가입 화면은 노출하지 않는다.
- SNS 지원 대상: `naver`, `google`, `kakao`. (안드로이드 기준 네이티브 SDK 사용, iOS는 후순위)
- **관리자 웹**은 이메일/비밀번호 로그인만 유지한다.
- 서버 `POST /auth/login`, `POST /auth/signup` API는 유지할 수 있으나 모바일 클라이언트에서는 호출하지 않는다.
- 흐름: 모바일이 각 provider 의 **네이티브 SDK** 로 로그인해 provider access token(또는 idToken)을 얻고, `POST /auth/social/:provider/exchange` 로 서버에 전달하면 서버가 provider 프로필을 검증해 우리 서비스의 `accessToken`/`refreshToken` 을 발급한다. 기존 Chrome Custom Tab + 서버 OAuth(`/start`·`/callback`) 흐름은 단종됐다.
- 계정 충돌 정책:
  - SNS 제공 이메일이 기존 이메일 계정과 충돌하면 자동 연결하지 않는다.
  - 사용자에게 `기존 계정 연결` / `새 SNS 계정 생성` / `취소`를 명시적으로 선택하게 한다.
  - 선택 결과에 따라 서버는 계정 연결 또는 분리 계정 생성을 수행한다.
- 취소/예외 처리:
  - 사용자가 SDK 화면에서 취소하면 로그인 화면에 취소 안내(info 토스트)를 노출하고 기존 상태를 유지한다.
  - SDK/네트워크 오류 시 재시도 버튼을 제공한다.
  - SNS 제공자가 이메일을 제공하지 않으면 분리 계정(시스템 생성 이메일)으로 가입 처리한다.

### 6.2 자동 입력(OCR)
- 입력: 영양성분표가 보이는 이미지.
- 출력: 칼로리, 탄수화물, 단백질, 지방 + 추출 신뢰도.
- 엔진: 외부 OCR API 연동을 기본으로 한다. (벤더 교체 가능하도록 추상화 계층 적용)
- 비용 전략: 초기에는 무료 티어/크레딧이 있는 OCR API를 우선 적용하고, 월 사용량 초과 시 유료 전환한다.
- 저장 전 사용자 확인을 필수로 한다. (자동 확정 금지)
- OCR 실패 시 수동 입력으로 즉시 전환 가능해야 한다.
- 사용량/결제 정책:
  - 회원별 무료 사용량은 `누적 5회`까지 제공한다.
  - 5회 초과 시 OCR API 호출 전 결제 상태를 검사하고, 미결제 상태면 결제 유도 화면으로 이동한다.
  - 결제 완료 회원은 OCR 기능을 추가 사용 가능하다.

### 6.6 과금/광고 정책
- OCR 과금:
  - 무료 플랜: 회원당 OCR 자동입력 5회
  - 유료 플랜: 무료 사용량 초과 후 OCR 자동입력 사용 가능
- 광고 정책:
  - 기본 플랜은 앱 하단 배너 광고 노출
  - `premium_monthly` 구독 결제 시 하단 광고를 제거한다.
- 복구 정책:
  - 결제 복구(restore purchase) 지원으로 재설치/기기 변경 시 권한을 복원한다.

#### 결제 모델 확정 (2안 비교 후 선택)
- 안 A(선택): `단일 구독형`
  - 무료 플랜: OCR 5회 + 하단 광고 노출
  - 프리미엄 월 구독 1종: OCR 추가 사용 + 광고 제거 동시 제공
- 안 B(미선택): `기능별 개별 구매형`
  - OCR 유료권과 광고 제거권을 별도 상품으로 판매
- 최종 선택: 안 A(단일 구독형)
- 선택 이유:
  - 초기 결제/권한/복구 로직 단순화
  - 운영 지표(전환율, 이탈률, ARPU) 해석 용이
  - 사용자에게 "하나 결제로 전체 해제" 메시지 전달이 명확

#### 가격/노출 정책 초안 (MVP)
- 가격:
  - `premium_monthly`: `월 4,900원` (VAT 포함 기준, 앱마켓 수수료 반영 전 내부 기준가)
- 결제 유도 시점:
  - OCR 4회 사용 완료 시 사전 안내 배너 노출
  - OCR 5회 사용 완료 시점부터 OCR 실행 전 결제 유도 모달 노출
  - 하단 광고는 앱 첫 실행부터 기본 노출, 설정 화면에서 `premium_monthly` 결제 진입 제공
- 사용자 안내 문구(초안):
  - 사전 안내: `무료 OCR 1회 남았어요. 프리미엄으로 무제한 OCR과 광고 제거를 이용해보세요.`
  - 결제 유도: `무료 OCR 5회를 모두 사용했어요. 프리미엄 구독으로 OCR을 계속 이용하고 광고를 제거할 수 있어요.`
  - 광고 제거 안내: `프리미엄 구독 시 하단 광고가 사라집니다.`
- 가격 운영 메모:
  - 출시 후 4주 전환율/이탈률을 확인해 가격 재조정 검토
  - 할인/프로모션은 출시 안정화 이후 별도 정책으로 분리

### 6.3 통계
- 기간: 한 끼, 하루, 일주일, 한 달.
- 지표: 총 칼로리, 총 탄수화물, 총 단백질, 총 지방.
- 비교: 권장량 대비 달성률(%).
- 집계 기준: 사용자 로컬 타임존의 00:00 기준 일자 경계.
- 집계 전략: 일 배치 집계를 기본으로 하며, 앱 조회 시 배치 결과를 우선 사용한다.
- 지연 허용치(권장): 집계 기준시각 대비 `최대 6시간` 이내.
- 지연 허용치 초과 시(`isStale=true` and 6시간 초과) 관리자 대시보드 경고 및 강제 재집계 버튼 사용 대상이 된다.

### 6.4 권장량/목표
- 입력값: 성별, 나이, 신장, 체중, 목표(감량/유지/증량), 활동량.
- 기본 제공:
  - 단백질 권장량(g/day): 체중(kg) x 활동계수(정책표 기반)
  - 칼로리 목표(kcal/day): 기초대사량(BMR) + 활동대사량 추정
- 사용자 직접 설정 시 시스템 권장값보다 우선 적용.
- 권장값/사용자값 모두 변경 이력 저장.
- 프로필 입력 검증:
  - 나이/신장/체중은 허용 범위(정책값) 밖이면 저장 불가 및 필드 오류를 표시한다.
  - 단, 초기 MVP 단계에서는 허용 범위 정책값을 고정하지 않고 운영 데이터 기반으로 추후 확정할 수 있다.

#### 활동량별 단백질 권장 계수표 (초기 운영 기준)
- 목적: 앱 내 기본 추천치 산출에 사용하며, 사용자 수동 설정 시 덮어쓸 수 있다.
- 단위: `g/kg/day`

| 활동량 단계 | 설명 | 단백질 계수 |
|---|---|---|
| 낮음(비활동) | 규칙적 운동 거의 없음 | 0.9 |
| 보통(주 1~3회) | 가벼운 유산소/근력 | 1.2 |
| 높음(주 3~5회) | 중강도 이상 규칙 운동 | 1.6 |
| 매우 높음(주 6회+) | 고강도/근비대 중심 훈련 | 2.0 |

- 근거 출처:
  - 한국인 일반 단백질 권장섭취량(RNI) 약 0.91 g/kg/day (KDRIs 2020 해설 자료)
  - 운동 성인 1.4~2.0 g/kg/day (ACSM/AND/DC Joint Position, ISSN Position Stand)
- 운영 메모:
  - 감량기 근손실 방지 등 특수 상황은 코치/전문가 모드에서 2.2 이상 옵션을 별도 제공할 수 있다.
  - 본 계수표는 MVP 기본값이며, 출시 후 실제 데이터 기반으로 재보정한다.

### 6.5 관리자 기능
- 회원관리: 회원 검색, 상태 변경(활성/비활성), 기본 활동 로그 조회.
- 음식관리: 템플릿 CRUD 중 삭제 대신 비활성화.
- 문의관리: 접수/처리중/완료 상태 전환.
- 공지관리: 초안/게시/비활성화.
- 대시보드: 주요 운영 KPI(신규 가입, 활성 사용자, 기록 생성 수, 문의 건수).
- 통계관리: 배치 지연 상태 확인 및 `최신값 반영(강제 재집계)` 실행 버튼 제공.
- 웹 목록 UX 정책(회원/음식/문의/공지 공통):
  - 테이블 상단 필터 영역 제공(검색어/상태/기간 등)
  - 기본 페이지당 15건, 하단 중앙 페이지네이션
  - 검색 버튼 사용 시 초기화 버튼은 검색 버튼 오른쪽 배치
  - 필터/검색 상태는 페이지 이동 후에도 유지

#### 문의/공지 워크플로우 SLA (확정, 간소화)
- 문의 상태: `접수 -> 처리중 -> 완료`
- 문의 응답 SLA:
  - 답변 기준: `2영업일 이내` 답변
  - 주말/공휴일은 영업일 계산에서 제외
- 공지 워크플로우: `초안 -> 검토 -> 게시 -> 비활성화`

## 7) 데이터/정책 요구사항

### 7.1 삭제/비활성화 정책 (중요)
- 앱/관리자 모두 기본 삭제는 즉시 물리 삭제가 아니라 `비활성화(soft delete)`로 처리한다.
- 비활성화 데이터는 사용자 앱에서 보이지 않아야 한다.
- 비활성화 후 1년 경과 시 배치 작업으로 완전 삭제(hard delete)한다.
- 법적 보관 의무가 있는 데이터는 예외 테이블로 분리해 보관 정책을 따른다.
- 적용 대상: 회원, 음식 템플릿, 식사 기록, 공지, 문의 데이터.
- 예외 대상: 감사 로그/운영 로그는 삭제 대상에서 제외하고 별도 보관 정책을 따른다.
- 예외 대상 보존기간: 감사 로그/운영 로그는 `5년` 보관 후 파기한다.
- 조회 기본값: 비활성화 데이터 제외, 관리자에서 `비활성 포함` 필터로만 조회 가능.
- 영구삭제 기준: `deactivatedAt + 1년` 도달 시 purge 배치 대상으로 판단한다.
- 로그인 정책: 비활성화된 회원은 앱/관리자 모두 로그인 및 토큰 재발급이 차단되어야 한다.
- 템플릿 비활성화 영향: 이미 저장된 과거 식사 기록은 유지하고, 신규 기록에서만 선택 불가 처리한다.

### 7.2 감사/추적
- 관리자 주요 액션(회원 상태 변경, 음식 템플릿 변경, 공지 게시)은 감사 로그를 남긴다.

### 7.3 보안/권한
- 관리자 페이지는 관리자 권한 사용자만 접근 가능해야 한다.
- 관리자 권한 레벨은 단일 레벨(분리 없음)로 운영한다.
- 개인정보(신장, 체중, 나이)는 암호화 저장 또는 최소한 컬럼 레벨 보호 정책을 적용한다.

## 8) 상태 처리 원칙 (UI 공통)
- 기본, 로딩, 빈 데이터, 오류, 완료, 권한 제한 상태를 화면별로 정의한다.
- 자동입력 실패/부분인식/저신뢰도 상태는 별도 오류 UX를 둔다.

### 8.1 엣지케이스/에러 처리 기준 (필수)
- 네트워크/서버 공통:
  - 5xx/타임아웃 발생 시 사용자 액션(저장/조회)은 재시도 버튼을 제공한다.
  - 중복 제출 방지를 위해 저장 버튼은 요청 중 비활성화하고, 동일 요청은 idempotency key로 1회 처리한다.
- 인증/권한:
  - 액세스 토큰 만료 시 1회 자동 재발급 후 재요청, 실패 시 로그인 화면으로 이동한다.
  - 권한 없음(403)은 기능을 숨기지 말고 접근 불가 안내를 노출한다.
  - SNS 인증 충돌(`ACCOUNT_CONFLICT`) 발생 시 연결/분리/취소 선택 UI를 노출한다.
  - SNS 로그인 취소(`OAUTH_CANCELLED`)는 오류가 아닌 사용자 취소 상태로 처리한다.
- OCR:
  - OCR 결과 필드 일부 누락 시 누락 필드만 수동 입력 요구 후 저장 가능해야 한다.
  - OCR 신뢰도 기준치 미만이면 자동 입력값을 임시값으로 표시하고 사용자 확정을 필수로 한다.
  - OCR 요청 실패(외부 API 장애/한도 초과) 시 수동 입력 플로우로 즉시 전환하고 재시도 옵션을 제공한다.
  - 무료 사용량 초과 + 미결제 상태면 OCR 호출을 차단하고 결제 유도 모달을 노출한다.
- 통계(일 배치 집계):
  - 배치 미완료/지연 시 마지막 성공 스냅샷 시각을 표시하고, 최신 데이터 반영 지연 안내를 노출한다.
  - 배치 데이터가 없으면 빈 상태와 함께 기록 입력 CTA를 제공한다.
  - 타임존 변경 사용자는 변경 시점 이후 집계부터 새 타임존 기준을 적용하고, 과거 집계는 재배치 정책에 따른다.
- 삭제/비활성화:
  - 비활성화 대상이 이미 비활성화 상태이면 성공으로 간주(멱등)하고 현재 상태를 반환한다.
  - 비활성화 직후 조회 캐시가 남아 노출되는 문제를 막기 위해 앱/관리자 모두 관련 캐시 무효화를 수행한다.
- 파일 업로드:
  - 지원 확장자/용량 제한을 초과하면 업로드 전 클라이언트에서 차단하고 사유를 표시한다.
  - 업로드 성공 후 OCR 실패 시 원본 이미지는 유지하여 재시도 또는 수동 입력에 재사용 가능해야 한다.

## 9) 비기능 요구사항
- 이미지 업로드 후 OCR 1차 결과는 평균 3초 이내 목표.
- 통계 화면 기본 조회는 1초 이내(최근 30일 기준) 목표.
- 다크모드 기본 지원.
- 라이트/다크 모드 전환 토글을 제공하고, 선택 상태는 재방문 시에도 유지되어야 한다. (admin-web 자체 토글 + `apps/mobile`은 v0.1로 Subscription 탭 "테마 설정" 카드에서 제공, 세부 정책 `feature-mobile-theme-toggle-prd.md`)
- 결과 메시지(저장 성공/실패·경고)는 일관된 토스트 패턴으로 표시한다. 모바일은 `feature-mobile-toast-prd.md` v0.1(단일 교체 큐잉, 하단 safe-area 위치, success/error/info 3종), admin-web은 `feature-admin-toast-prd.md` v0.1(스택 최대 3개 큐잉, top-right 위치)로 양 플랫폼 공통화. 시간(success/info=3.5s, error=5s)·종류·자체 구현은 동일 정책. 인증 흐름(LoginPage/LoginScreen)도 토스트 적용 완료(이메일·SNS·계정 충돌 분기 포함, 인라인 메시지는 보조로 유지).
- 사용자 설정은 별도 "설정" 탭에서 일관 진입한다(`feature-mobile-settings-tab-prd.md` v0.1, `mobile-settings-tab-spec.md` v0.5로 디자인+구현 완료. SettingsScreen 신규, MainTabs 5번째 탭, ProfileEdit·테마는 Settings로 이전, 알림은 "준비 중" 슬롯 예약, **계정 카드 신설(Phase M B1)로 로그아웃을 Settings 탭에 통합**, MainTabs 5탭에 **`@expo/vector-icons` Ionicons + 라벨 + 다크 정합 토큰 적용(Phase M B2)**). LoginScreen 색상도 `useTheme()` 토큰 정합 완료(SNS 브랜드 색만 의도적 유지). 모바일 `theme.tsx`에 `borderStrong` 토큰 신규(light `#cbd5e1` / dark `#475569`)이 추가돼 admin-web `--ds-border-strong`과 의미·역할이 정합된다.
- 시각 점검 누적 체크리스트는 `docs/design/visual-inspection-cumulative.md` v0.3(78 항목, 실효 77)로 단일 진입점화. 새 트랙 산출 시 본 문서의 카테고리에 항목 추가.
- 모바일/웹 접근성 기본 가이드 준수.

## 10) API 계약 초안 (요약)
- Auth
  - `POST /auth/signup`
  - `POST /auth/login`
  - `POST /auth/refresh`
- Profile
  - `GET /me/profile` — v1.3에서 응답에 `activityLevel?`/`goal?` 추가(nullable).
  - `PUT /me/profile` — v1.2 검증 + v1.3 enum 보강(`activityLevel`/`goal`, `null` 명시 = clear). 자세한 계약은 `feature-diet-management-api-contract-v1.md` v1.3.
  - `POST /me/recommendation/recalculate` — v1.3에서 BMR(미플린-세인트 지오어) × 활동 계수 × 목표 가감 로직으로 교체. NULL 시 안전 기본값 `moderate`/`maintain`.
- Mobile Onboarding(APP_ONBOARD): 부팅 시 `dm_onboarding_done` SecureStore 플래그 기반 자동 진입, 저장 후 `POST /me/recommendation/recalculate` 자동 호출. 세부 정책은 `feature-mobile-onboarding-prd.md` v0.1.
- Mobile Profile Extra(활동량·목표): Onboarding 슬롯 + ProfileEdit 화면(Subscription 탭 진입). 세부 정책은 `feature-mobile-profile-extra-prd.md` v0.1.
- Meal Records
  - `POST /meals`
  - `GET /meals?from=&to=&page=`
  - `PUT /meals/{mealId}`
  - `PATCH /meals/{mealId}/deactivate`
- OCR
  - `POST /nutrition/ocr`
- Stats
  - `GET /stats?range=meal|day|week|month`
- Admin
  - `GET /admin/dashboard`
  - `POST /admin/stats/reaggregate`
  - `GET /admin/users?query=&status=&from=&to=&includeInactive=&page=&size=15`
  - `PATCH /admin/users/{id}/deactivate`
  - `GET /admin/foods?query=&status=&category=&includeInactive=&page=&size=15`
  - `POST /admin/foods`
  - `PUT /admin/foods/{id}`
  - `PATCH /admin/foods/{id}/deactivate`
  - `GET /admin/inquiries?query=&status=&from=&to=&includeInactive=&page=&size=15`
  - `PATCH /admin/inquiries/{id}/status`
  - `PATCH /admin/inquiries/{id}/deactivate`
  - `GET /admin/notices?query=&status=&from=&to=&includeInactive=&page=&size=15`
  - `POST /admin/notices`
  - `PUT /admin/notices/{id}`
  - `PATCH /admin/notices/{id}/deactivate`

### 10.1 통계 응답 계약 (배치 집계 연계)
- `GET /stats` 응답에는 아래 필드를 포함한다.
  - `aggregatedAt`: 마지막 배치 집계 완료 시각(ISO 8601)
  - `isStale`: 최신 기록 반영 지연 여부(boolean)
  - `timezone`: 집계 기준 타임존
- `staleHours`(숫자) 필드를 포함해 현재 지연 시간을 제공한다.
- 클라이언트는 `isStale=true`이면 지연 안내를 노출한다.

### 10.2 공통 오류 응답 규약
- 오류 응답 포맷:
  - `code`: 문자열 에러 코드 (예: `AUTH_UNAUTHORIZED`, `OCR_RATE_LIMIT`)
  - `message`: 사용자 표시 가능한 기본 메시지
  - `details`: 필드 단위 오류/디버그 보조 정보(선택)
  - `traceId`: 로그 추적용 ID
- 최소 상태 코드 기준:
  - 400(요청값 오류), 401(인증 실패), 402(결제 필요), 403(권한 없음), 404(리소스 없음), 409(상태 충돌), 422(검증 실패), 429(요청 한도), 500(서버 오류), 503(외부 의존 장애)
- 클라이언트 처리 원칙:
  - 4xx는 사용자 수정 가능한 안내를 우선 노출한다.
  - 5xx/503은 재시도와 고객센터 진입 경로를 함께 제공한다.

### 10.3 관리자 KPI 계산식 기준(초안)
- `newUsers`: 조회 기간 내 가입 완료 사용자 수(중복 제외)
- `activeUsers`: 조회 기간 내 식사 기록 1회 이상 생성한 고유 사용자 수
- `mealRecordCount`: 조회 기간 내 생성된 식사 기록 총 건수
- `inquiryCount`: 조회 기간 내 생성된 문의 총 건수(비활성 제외 기본값)
- 모든 KPI는 기본적으로 관리자 선택 타임존 기준 일자 경계를 따른다.

### 10.4 과금/광고 API 계약(요약)
- Billing
  - `GET /me/billing/entitlements`
  - `POST /me/billing/checkout`
  - `POST /me/billing/restore`
- Ads
  - `GET /me/ads/status`
- 상품 정책:
  - MVP 기본 상품은 `premium_monthly` 단일 SKU로 운영한다.
  - `GET /me/billing/entitlements` 응답에 `nextPaywallTrigger`(예: `ocr_remaining_1`, `ocr_exhausted`)를 포함할 수 있다.

## 11) 미확정/결정 필요 항목
- 없음 (현재 PRD 기준)

## 12) 구현 트랙 제안 (Gate 2 전 사전 계획)
- Track A (Backend): 인증, 프로필/권장량, 식사 기록, 통계 API, soft delete + 1년 purge 배치.
- Track B (Frontend App): 기록 입력/사진 업로드/OCR 검수/통계 화면/목표 설정.
- Track C (Admin Web): 회원/음식/문의/공지/대시보드 화면과 상태 전이.
- 병렬 조건: API 계약 및 상태 UI 맵 확정 후에만 병렬 구현 착수.

## 13) 성공 지표 (초안)
- 7일 리텐션
- 주간 기록 작성 사용자 비율
- OCR 자동입력 후 수정률(정확도 간접 지표)
- 관리자 문의 처리 리드타임

## 14) 변경/보완한 사항과 이유
1. `자동입력 결과 사용자 확인 필수`를 추가함.
   - 이유: OCR 오인식으로 잘못된 영양정보가 저장되는 위험 방지.
2. `삭제=비활성화 + 1년 후 배치 삭제`를 회원/음식/공지 등 전체 엔티티 정책으로 명시함.
   - 이유: 요구사항 일관성 확보 및 운영/법적 대응 가능성 고려.
3. `통계 일자 경계 타임존 기준`을 명시함.
   - 이유: 하루/주/월 통계 불일치 및 사용자 혼란 방지.
4. `권장량은 시스템 제안 + 사용자 오버라이드 우선` 정책을 명시함.
   - 이유: 개인 목표/전문가 조언 반영을 위한 유연성 확보.
5. `관리자 감사 로그`를 추가함.
   - 이유: 회원 비활성화/운영 조치에 대한 추적성과 책임성 확보.
6. `OCR 엔진은 외부 API 사용`으로 확정하고 벤더 추상화 원칙을 추가함.
   - 이유: 초기 개발 속도를 확보하면서 교체 가능성을 유지하기 위함.
7. `활동량별 단백질 계수표`를 문서에 고정값으로 저장함.
   - 이유: 추천량 계산의 일관성과 운영 기준의 명확성 확보.
8. `관리자 권한 레벨 분리 없음`으로 확정함.
   - 이유: 초기 운영 복잡도를 낮추고 권한 모델을 단순화하기 위함.
9. `통계 집계 전략은 일 배치`로 확정함.
   - 이유: 조회 성능과 집계 비용을 안정적으로 관리하기 위함.
10. `문의/공지 워크플로우 SLA` 추천안을 추가해 초기 운영 기준으로 확정함.
   - 이유: 처리 지연을 줄이고 운영 대시보드에서 관리 가능한 기준선을 만들기 위함.
11. 관리자 웹 목록 화면의 필터/페이지네이션 기준을 추가함.
   - 이유: 웹 운영 화면의 탐색성과 일관된 조작 정책을 보장하기 위함.
12. 다크모드 전환 토글 및 상태 유지 요건을 추가함.
   - 이유: 다크모드 지원 선언만으로 생기는 구현 해석 차이를 방지하기 위함.
13. soft delete 적용/예외 대상을 명시함.
   - 이유: 삭제 정책 해석 불일치(문의/로그 데이터 처리) 가능성을 줄이기 위함.
14. 엣지케이스/에러 처리 기준(네트워크, 인증, OCR, 배치 지연, 비활성화 경합, 업로드 실패)을 추가함.
   - 이유: 실패 시 화면/서버 동작의 불일치를 줄이고 회귀 위험을 낮추기 위함.
15. 공통 오류 응답 규약(code/message/details/traceId + 상태코드 기준)을 추가함.
   - 이유: 앱/관리자/백엔드 간 오류 처리 일관성을 확보하기 위함.
16. soft delete 정책과 API 계약 정합을 위해 문의 비활성화 엔드포인트를 추가함.
   - 이유: 적용 대상(문의 포함)과 실제 운영 API 간 불일치를 해소하기 위함.
17. 배치 통계 신선도 필드(aggregatedAt/isStale/timezone)를 통계 응답 계약에 추가함.
   - 이유: 배치 지연 시 사용자 안내 기준을 API 수준에서 보장하기 위함.
18. 입력값 검증(음식 기록/프로필) 기준을 추가함.
   - 이유: 음수/비정상치 데이터 유입으로 인한 통계 왜곡을 방지하기 위함.
19. 영구삭제 기준시각(`deactivatedAt + 1년`)과 비활성 회원 로그인 차단을 명시함.
   - 이유: 삭제 배치 판정과 인증 정책의 해석 차이를 없애기 위함.
20. 템플릿 비활성화가 과거 기록에는 영향 주지 않도록 정책을 명시함.
   - 이유: 과거 통계/기록 무결성을 보존하기 위함.
21. 관리자 목록 API에 필터/페이지네이션 파라미터를 명시함.
   - 이유: 웹 테이블 UX 정책과 API 계약 간 정합을 맞추기 위함.
22. 인증 재발급 흐름 정합을 위해 `POST /auth/refresh`를 추가함.
   - 이유: 토큰 만료 시 자동 재발급 정책과 API 계약 간 누락을 해소하기 위함.
23. 관리자 대시보드 범위 정합을 위해 `GET /admin/dashboard`를 추가함.
   - 이유: 관리자 MVP 범위(대시보드)와 API 초안 간 불일치를 해소하기 위함.
24. 입력 검증 정책값(나이/신장/체중)은 MVP에서 미고정 운영 가능하도록 명시함.
   - 이유: 초기 사용자 데이터 기반으로 합리적 범위를 후속 확정하기 위함.
25. 배치 통계 지연 허용치 6시간과 관리자 강제 재집계 버튼을 추가함.
   - 이유: 지연 운영 기준과 대응 액션을 명확히 해 운영 공백을 줄이기 위함.
26. 감사/운영 로그 보존기간을 5년으로 확정함.
   - 이유: 예외 데이터 보관 기준을 명확히 해 컴플라이언스 리스크를 줄이기 위함.
27. 관리자 KPI 계산식 기준을 문서화함.
   - 이유: 대시보드 지표 해석 불일치를 예방하기 위함.
28. OCR 무료 5회 + 초과 결제 정책을 추가함.
   - 이유: OCR API 비용을 통제하면서 핵심 기능 체험을 제공하기 위함.
29. 하단 광고 기본 노출 + 결제 제거 정책을 추가함.
   - 이유: 무료 사용자 수익화와 유료 사용자 경험 개선을 동시에 달성하기 위함.
30. 결제 모델을 단일 구독형(무료 + 프리미엄 월 1종)으로 확정함.
   - 이유: 초기 구현/운영 복잡도를 낮추고 사용자 결제 이해도를 높이기 위함.

## 15) 구현 진행 이력 (Phase 타임라인)

§9·§10에 흩어진 회차별 결과 메모를 단일 진입점으로 정리한다. 상세는 `docs/design/admin-stitch-gap-2026-05-08.md`의 회차 헤더에 그대로 있고, 본 절은 한 줄 요약 + 회차/Phase 번호 매핑만 담는다. 새 Phase 진행 시 본 표에 한 줄 추가한다.

| 회차 | Phase | 날짜 | 트랙 요약 | 주 산출 |
|---|---|---|---|---|
| 1 | — | 2026-05-09 | 백엔드 API 계약 보강 v1.1 | `feature-diet-management-api-contract-v1.md` v1.1 |
| 2 | — | 2026-05-09 | 프론트 UI 트랙 종료 (admin-web FOODS/INQUIRIES/NOTICES + 대시보드) | dev smoke 22 케이스 ✓ |
| 3 | — | 2026-05-09 | 모바일 APP_ONBOARD v1.2 | `OnboardingScreen` + Field/Segmented + SecureStore + 자동 recalc |
| 4 | — | 2026-05-09 | 모바일 프로필 확장 v1.3 (활동량·목표) | `ProfileEditScreen` + `RadioGroup` + Mifflin-St Jeor |
| 5 | — | 2026-05-09 | 모바일 테마 사용자 토글 v0.1 | `userPrefs.ts` + `theme.tsx` 사용자 모드 영속 |
| 6 | — | 2026-05-09 | emergent-rule (A) 정식 룰 승격 | `.cursor/rules/67-dual-design-exemption.mdc` |
| 7 | G | 2026-05-09 | 모바일 토스트 v0.1 | `apps/mobile/src/toast/` (단일 교체 큐잉, 하단) |
| 8 | H | 2026-05-09 | admin-web 토스트 v0.1 | `apps/admin-web/src/toast/` (스택 ≤3, 우상단) |
| 9 | I | 2026-05-09 | 양 플랫폼 LoginPage/LoginScreen 토스트 + Settings 탭 PRD v0.1 | 인증 분기 토스트 + `feature-mobile-settings-tab-prd.md` |
| 10 | J | 2026-05-09 | Settings 탭 구현 + LoginScreen 다크 정합 | SettingsScreen 신설, MainTabs 5번째 탭, LoginScreen 토큰화 |
| 11 | K | 2026-05-09 | `borderStrong` 토큰 + emergent-rule (B)·(C) 점검 | `theme.tsx` 토큰 추가, 누적 1회 유지 |
| 12 | L | 2026-05-09 | 시각 점검 누적 통합 + MainTabs 텍스트 이모지 | `visual-inspection-cumulative.md` v0.1 + 5탭 이모지 |
| 13 | M | 2026-05-10 | Settings 계정 카드(B1) + Ionicons 업그레이드(B2) | `SettingsScreen` 카드 4 + `@expo/vector-icons` Ionicons |
| 14 | N | 2026-05-10 | 모체 PRD §15 타임라인 신설(A2) + dev smoke 회귀 점검(A3) | 본 절 신규 + `scripts/dev-smoke/phase-n.mjs` 14/14 PASS |
| 15 | O | 2026-05-10 | 모바일 알림 본 기능 (B3) — PRD v0.2 + 디자인 스펙 v0.2 + 67 면제 단일안 + 단계 4 구현 | `expo-notifications` 도입, `notifications/` 4파일 + `notifPrefs.ts` + `NotificationCard.tsx` 신규. 식사 3개(08:00/12:30/18:30) + 권장량 미달 1개(20:00, 동적 본문). dev smoke 14/14, 시각 점검 누적 v0.4(92항/실효 90) |
| 16 | P | 2026-05-10 | 권장 계산 v1.4 (B4) 단계 1+2+4 — 근거 조사 + PRD v0.2 + 디자인 스펙 v0.2 + 구현 + 검증 (67 면제 단일안) | `recommendation-v14-evidence.md` + `feature-recommendation-v14-prd.md` v0.2 + `recommendation-v14-spec.md` v0.2. **서버**: `recommendation.ts` v1.4 정책(청소년 maintain_with_caution / 고령 delta clamp 150~300 + 단백질 ≥1.1 g/kg / floor M1500·F1200 / 자동 단백질 상한 2.0 g/kg) + `me.ts` GET·recalc 양쪽에 `recommendationVersion`/`policy`/`warnings` 메타. **모바일**: `api/profile` 메타 타입 + `copy/recommendation` SSOT 8키 + `ProfileEditScreen` 카드(v1.4 caption + 추정 보조 + warnings 행) + `OnboardingScreen` success 토스트 본문 교체 + `NotificationCard` 미달 토글 helper. **검증**: phase-p.mjs 9/9 + phase-n.mjs 14/14 + tsc(server·mobile) clean |
| 17 | Q+R+S | 2026-05-10 | 안정화 패스 — 회귀 baseline + dev smoke 통합 러너 + warn 토큰 의미 확장 | **Q**: phase-n 14/14 + phase-p 9/9 + server·mobile·admin-web tsc clean(실 디바이스 시각 점검은 사용자 환경 위임). **R**: `scripts/dev-smoke/all.mjs` 신규 + `package.json` `smoke:dev`/`:n`/`:p` 스크립트. **S**: `theme.tsx` `warn` 토큰 의미 주석 보강(별도 신규 토큰 없음, 67 좁은 스코프 유지) + `ProfileEditScreen` warnings 행을 `t.colors.warn`으로 적용 + `recommendation-v14-spec.md` v0.3 + `visual-inspection-cumulative.md` 항목 갱신 |
| 18 | T+U+V | 2026-05-10 | 사용자 override 입력 + 안내 확장 검토 + 릴리즈 점검 (67 면제 단일안) | **T**: `feature-recommendation-override-prd.md` v0.1(7개 결정 일괄 채택) + `recommendation-override-spec.md` v0.2(구현 완료). 모바일 3파일(`api/profile` `ProfileInput` 두 필드 추가 + `copy/recommendation` `OVERRIDE_COPY` 11키 + `ProfileEditScreen` 토글/입력/reset/medicalGeneric). 서버 변경 0(기존 PUT 재사용). dev smoke `phase-t.mjs` 7/7 신규. **U**: HomeScreen/StatsScreen이 권장량 미노출이라 안내 확장 보류 결론(스펙 §11.3 기록). **V**: server build + admin-web build + api-client build + mobile tsc 모두 clean. 통합 smoke `phase-n` 14/14 + `phase-p` 9/9 + `phase-t` 7/7 = **30/30 PASS** |

### emergent-rule 누적 상태 (Phase V 종료 시점)

| 후보 | 누적 | 정식 룰 승격 |
|---|---|---|
| (A) 67-dual-design-exemption | 승격 시점 3회 + 이후 다수 적용 (G·H·I·J·L·O·**P**·**S**·**T**) | ✓ 승격됨 (2026-05-09, `67-dual-design-exemption.mdc`). Phase S(warn 토큰 의미 확장) + Phase T(override 입력 — 신규 화면 0, 컴포넌트 0, 서버 변경 0) 모두 단일안 그대로 진행 |
| (B) PUT nullable clear | 1회 | 보류 (Phase O·P 미발동: 신규 PUT nullable 필드 없음, 응답 메타 추가만) |
| (C) 부팅 비동기 컨텍스트 미렌더 | 1회 | 보류 (Phase O·P 미발동: 부팅 컨텍스트 변경 없음) |

### 다음 Phase 후보

| Phase | 트랙 | 진입 조건 |
|---|---|---|
| N | ✓ 완료 (2026-05-10, 14회차) | — |
| O | ✓ 완료 (2026-05-10, 15회차) | — |
| P | ✓ 완료 (2026-05-10, 16회차) — 권장 계산 v1.4 단계 1+2+4 자동 통합 진행 | — |
| Q | ✓ 완료 (2026-05-10, 17회차) — 회귀 baseline 자동 점검 | — |
| R | ✓ 완료 (2026-05-10, 17회차) — `scripts/dev-smoke/all.mjs` 통합 러너 + npm scripts | — |
| S | ✓ 완료 (2026-05-10, 17회차) — `warn` 토큰 의미 확장 (신규 토큰 0) | — |
| T | ✓ 완료 (2026-05-10, 18회차) — 사용자 override 입력 (PRD v0.1 + 디자인 v0.2 + 구현 + smoke 7/7) | — |
| U | ✓ 완료 (2026-05-10, 18회차) — 홈/통계 안내 확장 보류 결론(권장량 미노출) | — |
| V | ✓ 완료 (2026-05-10, 18회차) — release-check: server/admin-web/api-client build + mobile tsc + 통합 smoke 30/30 PASS | — |
| W (후보) | StatsScreen에 권장량 대비 충족률(`protein/proteinGoalG`) 도입 + 충족률 카드 안에서 v1.4 warnings 1줄 노출 (Phase U 보류 항목 후속) | 우선순위 보통. 사용자 요청 시 진입 |
