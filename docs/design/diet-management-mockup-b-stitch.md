---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-16
tags: [design, mockup, option-b, stitch]
---

# 식단 관리 디자인안 B (Stitch 기반)

## 개요
- 목적: 디자인 시스템 일관성과 확장성을 우선한 UI 설계
- 기준: `docs/design/stitch-sop.md` 표준 순서 준수
- 플랫폼: 모바일 앱 + 관리자 웹

## Stitch 작업 계획
- 프로젝트/디자인 시스템
  - `list_projects` -> `create_project`(필요 시) -> `get_project`
  - `create_design_system` -> `update_design_system`
- 화면 생성
  - 앱: 홈/기록입력/통계/구독
  - 웹: 대시보드/회원/음식/문의/공지
- 변형/수정
  - `generate_variants`로 2~3개 시안 생성
  - `edit_screens`로 결제 유도/지연 배너 위치 조정

## B안 디자인 원칙
- 토큰 중심(색상/타이포/간격)으로 다크모드 일관성 확보
- 상태 UI를 컴포넌트 레벨에서 공통 패턴화
- 앱과 웹의 정보 구조를 분리하되, 용어/상태값은 동일하게 유지

## 모바일 앱 화면(목업 범위)
- 홈 대시보드
  - 오늘 섭취 카드 + 목표 달성률 링
  - OCR 남은 횟수 칩
- 기록 입력
  - 카메라 OCR CTA 강조
  - 무료 5회 소진 시 paywall 바텀시트
- 통계
  - 기간 전환 세그먼트
  - stale 배너 + 마지막 집계시각
- 구독
  - 무료/프리미엄 비교 카드
  - `premium_monthly` CTA

## 관리자 웹 화면(목업 범위)
- 운영 대시보드
  - KPI 카드 행 + 지연 상태 위젯 + 재집계 버튼
- 목록 4종
  - 공통 필터 바 / 공통 테이블 / 공통 페이지네이션
  - 상태 뱃지(활성/비활성/처리중/완료)

## 상태 UI 스펙 (필수)
- 기본/로딩/빈/오류/권한 상태를 모든 핵심 화면에 포함
- 결제 상태(무료, 결제 필요, 복구 완료)를 별도 상태로 정의

## Stitch 산출물 기록 (확정)

### 프로젝트
- **projectId:** `7726060931590277332`
- **리소스 이름:** `projects/7726060931590277332`
- **제목:** Diet Management — dual mockup B (PRD 2026-05)

### 디자인 시스템
- **assetId / name:** `assets/1329886661735568102`
- **표시 이름:** DietManagement DS v1
- **메모:** `create_design_system` 직후 `update_design_system` 1회 호출은 MCP에서 invalid argument로 거절됨. DS는 `create` 결과·`list_design_systems`로 확인됨.

### 확정 화면 (screen 리소스 이름 · 스티치 내부 id · 요약)

#### 1차 세트 (2026-05-05)

| 화면 ID(브리프) | `projects/.../screens/{id}` | 제목/요약 |
|----------------|-----------------------------|-----------|
| APP_HOME (+ 상태 라벨 데모) | `projects/7726060931590277332/screens/edd17276ff6d46e4b5ccb918c6b7918e` | 홈 요약·OCR 배너·상태 섹션·OCR/수동 입력 |
| APP_LOG_OCR (페이월) | `projects/7726060931590277332/screens/07a9c65551c148d3b9ba1cd480a1718b` | 5회 소진 바텀시트·`premium_monthly` CTA |
| APP_STATS + APP_SUB_SETTINGS | `projects/7726060931590277332/screens/04b38f07d7a844bbbc64bf9d29589d83` | ~~합본~~ → **4차 세트 단독 ID로 대체** (아래 표) |
| ADM_DASH + ADM_MEMBERS | `projects/7726060931590277332/screens/9c137926c717437f918041b3a75c2abc` | ~~합본~~ → **4차 세트 단독 ID로 대체** (아래 표) |

#### 2차 세트 (2026-05-08, SDK 기반 단독 화면)

생성·DS v1 적용 후 폴리시(polish_edit_theme_agent) 처리된 최종 screen ID 입니다. 스크립트 산출은 `scripts/stitch/out/`에 보존(git 제외).

| 화면 ID(브리프) | Device | `projects/.../screens/{polished id}` | 제목/요약 |
|----------------|--------|--------------------------------------|-----------|
| ADM_FOODS | DESKTOP | `projects/7726060931590277332/screens/454cc85ce4394104bd4859fd99eabb05` | 음식 템플릿 관리 — 필터바(검색/상태/카테고리)·15행·드로어·5상태 |
| ADM_INQUIRIES | DESKTOP | `projects/7726060931590277332/screens/3b2bf02c38394d769a24759f52ccb25b` | 문의 관리 — 필터바·15행·답변 드로어·상태 변경·5상태 |
| ADM_NOTICES | DESKTOP | `projects/7726060931590277332/screens/3dc3d8becec44bf6a275c6276f6e2fa0` | 공지 관리 — 필터바·15행·작성 모달(MD 에디터)·5상태 |
| APP_ONBOARD | MOBILE | `projects/7726060931590277332/screens/fd8994c143c84e6b89d98bbad6ffad35` | 단일 스텝 프로필 입력(성별/나이/신장/체중/활동량/목표)·필드 단위 인라인 오류·sticky 다음 |

#### 3차 세트 (2026-05-16, 빠졌던 모바일 화면)

SDK 생성·DS v1 적용·폴리시드 ID. 프롬프트 SSOT: `scripts/stitch/lib/briefs-missing.ts`. 산출: `scripts/stitch/out/07-collected-missing.json`, HTML: `scripts/stitch/out/html-missing/*.html`.

| 화면 ID(브리프) | Device | `projects/.../screens/{polished id}` | 제목/요약 |
|----------------|--------|--------------------------------------|-----------|
| APP_LOGIN | MOBILE | `projects/7726060931590277332/screens/6bb93f8add714c3f973957c9fe2c510d` | 이메일+SNS 분리 로그인·충돌 카드·상태 데모 |
| APP_SIGNUP | MOBILE | `projects/7726060931590277332/screens/2333e99c46f14127ad058738700bf7a4` | 회원가입·필수 동의·검증 오류 |
| APP_SETTINGS | MOBILE | `projects/7726060931590277332/screens/b2fa3d8b9c45420ba4cc701345567092` | 설정 탭 4카드·알림 ON·하단 탭 바 |
| APP_PROFILE_EDIT | MOBILE | `projects/7726060931590277332/screens/cd5dd657c78d448c9e78a5b55f4dd801` | 프로필 편집·권장량 읽기전용·warnings |
| APP_POLICY_VIEW | MOBILE | `projects/7726060931590277332/screens/d06df35fb32546da867832534150b90a` | 이용약관 마크다운 뷰어 |

생성 직후(폴리시 전) screen ID는 `scripts/stitch/out/05-generated-missing-screens.json` 참조.

#### 4차 세트 (2026-05-16, 1차 합본 분리 + 개인정보처리방침)

프롬프트 SSOT: `scripts/stitch/lib/briefs-split.ts`. 산출: `scripts/stitch/out/10-collected-split.json`, HTML: `scripts/stitch/out/html-split/*.html`.

| 화면 ID(브리프) | Device | `projects/.../screens/{polished id}` | 제목/요약 |
|----------------|--------|--------------------------------------|-----------|
| APP_STATS | MOBILE | `projects/7726060931590277332/screens/4ed4cdfcdfb14502ad6c9be0eb1425a1` | 통계 탭 단독·stale·기간 세그먼트·5상태 |
| APP_SUB_SETTINGS | MOBILE | `projects/7726060931590277332/screens/fbad1cfc353f45b2b59f4e0e1f483659` | 구독 탭 단독·premium_monthly·복구 |
| ADM_DASH | DESKTOP | `projects/7726060931590277332/screens/1909d36b71ce4e1db15e1d93002c18e7` | KPI·지연 위젯·재집계 버튼 단독 |
| ADM_MEMBERS | DESKTOP | `projects/7726060931590277332/screens/3599dc26a0364f58b2328d4ae0dd120b` | 회원 목록·필터·15행·페이지네이션 단독 |
| APP_POLICY_PRIVACY | MOBILE | `projects/7726060931590277332/screens/9b2e8e4b12434ffe8a2dcad17a446f8a` | 개인정보처리방침 뷰어(APP_POLICY_VIEW privacy) |

생성/DS 적용에 사용된 프롬프트 SSOT는 `scripts/stitch/lib/briefs.ts`(1·2차), `briefs-missing.ts`(3차), `briefs-split.ts`(4차). 응답 원본은 `scripts/stitch/out/03`, `06`, `09-apply-split-design-system.json`.

### 스크린샷·HTML (예시)
- APP_HOME 스크린샷 파일: `projects/7726060931590277332/files/50f9f9b8c011408d8b3213827c2616e1` (다운로드 URL은 Stitch 세션에서 제공)
- 세부 `downloadUrl`은 MCP 생성 응답 또는 Stitch UI에서 확인 (외부 CDN 링크, 만료 가능)

### 생성 세션
- Mobile 세트 1: `sessionId` `1953197298073461136`
- Desktop 세트 1: `sessionId` `1995706918058668943`
- Mobile 세트 2: `sessionId` `18210500338580534169`
- 2차 단독 세트(2026-05-08, DS apply): `sessionId` `6052554810571617396`

### 프롬프트·수정 요약
- 공통 접두: PRD 승인본·`premium_monthly` 단일 SKU·OCR 5회·4회 배너·stale·관리자 테이블 15건·검색 오른쪽 초기화 (`docs/agent/diet-management-dual-mockup-brief.md`).
- 후속 제안(Stitch 출력): 회원 상세 팝업 / 엑셀 다운로드 / 대시보드 차트 — **미반영**, 필요 시 `edit_screens` 또는 신규 생성.

### 범위 메모
- ~~**APP_ONBOARD**, **ADM_FOODS / ADM_INQUIRIES / ADM_NOTICES** 는 이번 생성에서 별도 스크린으로 분리하지 않았습니다.~~ → **2026-05-08 SDK(`@google/stitch-sdk`) 기반으로 4화면을 단독 생성하고 DS v1을 일괄 적용했습니다.** 위 "2차 세트" 표 참조.
- 관리자 4종(대시/회원/음식/문의/공지) 및 모바일 온보딩까지 단독 화면 커버리지를 모두 확보했고, 후속 보정은 `edit_screens` 또는 신규 generate로 확장합니다.
- **2026-05-16 (3차):** 로그인·회원가입·설정·프로필 편집·이용약관 5화면 추가.
- **2026-05-16 (4차):** 통계/구독/대시보드/회원 목록 합본 분리 + 개인정보처리방침 단독 화면 추가. 구현 SSOT는 4차 폴리시드 ID 우선, 1차 합본 ID는 레거시 참고용.

## 리스크
- 초기 생성 결과가 요구와 어긋날 수 있어 수정 루프 시간이 필요
- 산출물 ID/링크 관리 누락 시 단계 3 진입 근거가 약해질 수 있음
