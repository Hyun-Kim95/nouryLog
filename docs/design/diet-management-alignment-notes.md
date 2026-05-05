---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-05
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
| 온보딩 화면 | ✓ | ✓ `AppOnboard` | 스티치 단독 스크린 미생성 | B 트랙 후속 생성 권장 |
| 음식/문의/공지 목록 | ✓ | ✓ 공통 테이블 패턴 | 동일 패턴 가정 (회원 화면 공유) | 후속 스크린 또는 컴포넌트 변형 |

## 루프 메모
- Stitch `update_design_system` 1회 실패(MCP invalid argument). DS 자체는 `list_design_systems`로 확인 완료.
- 세 부스트랩 문구(Stitch 통계 배너 등)는 **목업 샘플**이며 출시 카피는 PRD §6.6과 동일하게 맞출 것.
