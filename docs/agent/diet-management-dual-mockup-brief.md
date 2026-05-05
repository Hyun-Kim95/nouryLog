---
type: agent-brief
project: dietManagement
doc_lane: agent
updated_at: 2026-05-05
tags: [brief, dual-mockup, screens, states, ssot]
---

# 식단 관리 이중 목업(A/B) 공통 브리프

## 0) Metadata
- **Revision:** v1
- **Last updated:** 2026-05-05
- **Owner:** prd-agent + design-system-agent (산출), frontend-agent / Stitch 트랙이 동일 입력 사용
- **Decisions this revision:** PRD 승인본(`feature-diet-management-app-prd.md`)과 상태 매핑(`feature-diet-management-state-mapping.md`)을 A/B 공통 SSOT로 고정. 단일 구독 SKU는 `premium_monthly`. OCR 무료 누적 5회, 4회 배너·5회 페이월 정책 반영.

## 1) Goal
- 승인된 PRD를 공통 입력으로 **자체 목업(2A)** 과 **Stitch 목업(2B)** 이 동일한 화면·상태·용어로 재현할 수 있게 한다.

## 2) Scope
- **포함:** 앱 핵심 플로우(온보딩·홈·기록·통계·구독/설정), 관리자 핵심(대시보드·회원/음식/문의/공지 목록), 각 화면의 상태 UI(기본·로딩·빈·오류·권한), 웹 테이블 규칙(필터·15건·하단 중앙 페이지네이션·검색 오른쪽 초기화), 다크모드 토글 및 유지.
- **비포함:** 실 API 연동, 결제/스토어 실거래, OCR 실호출.

## 3) Policies And Constraints
- **과금:** 무료 OCR 5회; 4회 시 사전 배너, 5회 소진 시 OCR 실행 전 결제 유도(`premium_monthly`). 광고 제거는 동일 구독에 포함(PRD 안 A).
- **통계:** 배치 집계 우선; `isStale`·`staleHours`; 운영 기준 6시간 초과 시 관리자 경고·재집계 버튼 노출(목업에서는 버튼+더미/비활성 허용).
- **관리자 목록:** 필터 상단, 테이블, 페이지당 15건, 이전/다음 꺽쇠, 현재 페이지 강조, 비활성 포함 옵션.
- **용어 SSOT:** `premium_monthly`, `isStale`, `staleHours`, `OCR_FREE_QUOTA_EXCEEDED` 등은 API/상태 매핑 문서와 동일 철자.

## 4) Inputs
- PRD: `docs/requirements/feature-diet-management-app-prd.md`
- 상태 UI: `docs/requirements/feature-diet-management-state-mapping.md`
- API 계약(참고): `docs/requirements/feature-diet-management-api-contract-v1.md`
- A안 스펙: `docs/design/diet-management-mockup-a-internal.md`
- B안 스펙: `docs/design/diet-management-mockup-b-stitch.md`

## 5) Expected Outputs
- **2A:** 코드베이스 내 목업 전용 라우트에서 클릭 가능한 프로토타입.
- **2B:** Stitch 프로젝트·DS·화면 + `docs/design/diet-management-mockup-b-stitch.md`에 ID·프롬프트 요약 기록.
- **정합:** `docs/design/diet-management-alignment-notes.md`(별도)에서 PRD 대비 체크 결과 유지.

## 6) Done Criteria
- 아래 **화면 ID × 상태**가 A/B 모두에서 식별 가능(링크·스크린샷·코드 경로).
- OCR 5회·4회 배너·페이월·`premium_monthly` 단일 SKU가 시각적으로 반영.
- 통계 stale 배너 및 타임존/집계 시각 표기 자리 확보.
- 관리자 재집계 버튼 자리 및 목록 UX 규칙 준수.

## 7) Open Questions
- 허용 범위 정책값(나이·신장·체중) 숫자 하한/상한은 PRD상 추후 확정 → 목업에는 플레이스홀더 검증 메시지만.

## 8) Handoff Notes
- Stitch 프롬프트는 아래 **화면 ID 블록**을 그대로 붙여 넣어 일관성 유지.

---

## 디자인 시스템 (공통)
- **색상:** CSS 변수 기반 라이트/다크(`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--primary`, `--danger`, `--warn`, `--success`).
- **타이포:** 시스템 폰트 스택; 헤드라인/본문 크기 단계만 통일.
- **컴포넌트 명칭:** Primary 버튼, Ghost 버튼, Badge/Chip, Banner(경고·정보), Modal/Bottom sheet(페이월), Table row states.

---

## 화면 ID × 플랫폼 × 필수 상태

공통 상태 코드: `default` | `loading` | `empty` | `error` | `denied`  
(앱 기록/OCR·결제 흐름에 한해 `complete` 상태 UI 추가)

| 화면 ID | 플랫폼 | 설명 | 필수 상태 |
|--------|--------|------|------------|
| `APP_ONBOARD` | MOBILE | 온보딩/로그인·프로필 입력 | default, loading, error |
| `APP_HOME` | MOBILE | 오늘 요약·OCR 남은 횟수 배지 | default, empty, loading |
| `APP_LOG_OCR` | MOBILE | 기록 입력(수동/OCR), 4회 배너, 5회 페이월 | default, loading, error, complete |
| `APP_STATS` | MOBILE | 통계 기간 탭, stale 배너 | default, empty, loading, error |
| `APP_SUB_SETTINGS` | MOBILE | 구독/설정, 광고 영역, 복구 | default, loading, error |
| `ADM_DASH` | DESKTOP | KPI, 지연 카드, `POST /admin/stats/reaggregate` 대응 버튼 | default, loading, error |
| `ADM_MEMBERS` | DESKTOP | 회원 목록 테이블 | default, loading, empty, error, denied |
| `ADM_FOODS` | DESKTOP | 음식 템플릿 목록 | 동일 |
| `ADM_INQUIRIES` | DESKTOP | 문의 목록 | 동일 |
| `ADM_NOTICES` | DESKTOP | 공지 목록 | 동일 |

---

## Stitch `generate_screen_from_text` 프롬프트 템플릿 (화면별 공통 접두)

각 호출에 아래 고정 문단을 포함한다.

```text
프로젝트: 식단 관리 (PRD 승인). 단일 구독 SKU premium_monthly. OCR 무료 누적 5회, 4회 시 사전 배너, 5회 시 페이월.
통계는 배치 기반 isStale/staleHours 표시. 관리자 웹은 상단 필터, 검색 실행 버튼 오른쪽에 초기화 버튼, 테이블 15행 페이지, 하단 중앙 꺽쇠 페이지네이션.
필수 상태 UI: 기본, 로딩, 빈 데이터, 오류, 권한 제한. 다크모드 토글 가능한 톤. 과도한 장식 금지.
```

---

## 웹 테이블 필터 바 레이아웃 (관리자 공통)

1. 행1: 검색 입력 | 상태 선택 | 기간(시작~종료) | **검색** 버튼 | **초기화** 버튼(검색 오른쪽)
2. 행2(선택): 비활성 포함 체크박스
3. 테이블 아래 중앙: `< 이전` | `1 · 2 · 3` | `다음 >` 스타일

---

## 문서 참조 링크
- 에러 코드 UX: `feature-diet-management-state-mapping.md` §4
