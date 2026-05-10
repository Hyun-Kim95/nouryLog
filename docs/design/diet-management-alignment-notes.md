---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-08
tags: [alignment, prd, mockup]
---

# A/B 목업 PRD 정합 메모 (2C)

근거 PRD: `docs/requirements/feature-diet-management-app-prd.md` (approved)  
상태 매핑: `docs/requirements/feature-diet-management-state-mapping.md`

## 정합 요약
| 항목 | PRD | 안 A (자체 목업) | 안 B (Stitch) | 조치 |
|------|-----|------------------|---------------|------|
| OCR 무료 5회·4회 배너·5회 페이월 | ✓ | ✓ `AppLog` 데모 | ✓ 스크린 `07a9…`·`edd172…` | 없음 |
| `premium_monthly` 단일 SKU | ✓ | ✓ 구독·페이월 | ✓ | 없음 |
| 통계 `isStale` / 6h 운영 | ✓ | ✓ `AppStats` | ✓ 배너 문구·수치 데모 | Stitch 배너 예시 날짜가 샘플 값 → 구현 시 PRD 타임존·카피로 교체 |
| 관리자 재집계 `POST /admin/stats/reaggregate` | ✓ | ✓ 버튼 라벨 | ✓ 버튼 카피 | 없음 |
| 웹 필터·15건·하단 중앙 페이지네이션·검색 우측 초기화 | ✓ | ✓ `AdminTablePage` | ✓ `9c1379…` | 없음 |
| 온보딩 화면 | ✓ | ✓ `AppOnboard` | ✓ `fd8994…` (APP_ONBOARD, MOBILE, 2026-05-08 SDK 단독 생성) | 없음 |
| 음식 템플릿 목록 | ✓ | ✓ 공통 테이블 패턴 | ✓ `454cc8…` (ADM_FOODS, DESKTOP, 2026-05-08) | 없음 |
| 문의 목록 | ✓ | ✓ 공통 테이블 패턴 | ✓ `3b2bf0…` (ADM_INQUIRIES, DESKTOP, 2026-05-08) | 없음 |
| 공지 목록 | ✓ | ✓ 공통 테이블 패턴 | ✓ `3dc3d8…` (ADM_NOTICES, DESKTOP, 2026-05-08) | 없음 |

## 루프 메모
- Stitch `update_design_system` 1회 실패(MCP invalid argument). DS 자체는 `list_design_systems`로 확인 완료.
- 세 부스트랩 문구(Stitch 통계 배너 등)는 **목업 샘플**이며 출시 카피는 PRD §6.6과 동일하게 맞출 것.
- 2026-05-08: Cursor MCP `stitch` 활성화 실패로 SDK(`@google/stitch-sdk`) 기반 직접 호출로 전환 — `scripts/stitch/01~04`가 스크립트 SSOT, 프롬프트는 `scripts/stitch/lib/briefs.ts`. 4화면 모두 polished 결과 생성·DS v1 적용 완료.
- 신규 4화면의 카피·필터 옵션·드로어 슬롯은 "스티치 목업 샘플"이며, 운영 카피·라벨 정합은 c2 단계(`EntityListPage`/`DashboardPage`)에서 PRD §6.6 기준으로 점검·교체합니다.
