---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-05
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

| 화면 ID(브리프) | `projects/.../screens/{id}` | 제목/요약 |
|----------------|-----------------------------|-----------|
| APP_HOME (+ 상태 라벨 데모) | `projects/7726060931590277332/screens/edd17276ff6d46e4b5ccb918c6b7918e` | 홈 요약·OCR 배너·상태 섹션·OCR/수동 입력 |
| APP_LOG_OCR (페이월) | `projects/7726060931590277332/screens/07a9c65551c148d3b9ba1cd480a1718b` | 5회 소진 바텀시트·`premium_monthly` CTA |
| APP_STATS + APP_SUB_SETTINGS | `projects/7726060931590277332/screens/04b38f07d7a844bbbc64bf9d29589d83` | stale 배너·기간 탭·구독/복구 |
| ADM_DASH + ADM_MEMBERS | `projects/7726060931590277332/screens/9c137926c717437f918041b3a75c2abc` | KPI·재집계·필터+초기화·15행·페이지네이션 |

### 스크린샷·HTML (예시)
- APP_HOME 스크린샷 파일: `projects/7726060931590277332/files/50f9f9b8c011408d8b3213827c2616e1` (다운로드 URL은 Stitch 세션에서 제공)
- 세부 `downloadUrl`은 MCP 생성 응답 또는 Stitch UI에서 확인 (외부 CDN 링크, 만료 가능)

### 생성 세션
- Mobile 세트 1: `sessionId` `1953197298073461136`
- Desktop 세트 1: `sessionId` `1995706918058668943`
- Mobile 세트 2: `sessionId` `18210500338580534169`

### 프롬프트·수정 요약
- 공통 접두: PRD 승인본·`premium_monthly` 단일 SKU·OCR 5회·4회 배너·stale·관리자 테이블 15건·검색 오른쪽 초기화 (`docs/agent/diet-management-dual-mockup-brief.md`).
- 후속 제안(Stitch 출력): 회원 상세 팝업 / 엑셀 다운로드 / 대시보드 차트 — **미반영**, 필요 시 `edit_screens` 또는 신규 생성.

### 범위 메모
- **APP_ONBOARD**, **ADM_FOODS / ADM_INQUIRIES / ADM_NOTICES** 는 이번 생성에서 별도 스크린으로 분리하지 않았습니다. 관리자 목록은 동일 패턴(SSOT 브리프)으로 간주하고 Gate 2 전 `generate_screen_from_text` 또는 `edit_screens`로 확장합니다.

## 리스크
- 초기 생성 결과가 요구와 어긋날 수 있어 수정 루프 시간이 필요
- 산출물 ID/링크 관리 누락 시 단계 3 진입 근거가 약해질 수 있음
