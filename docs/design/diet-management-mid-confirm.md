---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-05
tags: [human-gate, mid-confirm, dual-mockup]
---

# 이중 목업 중간 컨펌 (A/B 동시 제시)

## 목적
PRD 승인 후 **안 A(자체 목업)** 과 **안 B(Stitch)** 초안을 동일 입력(`docs/agent/diet-management-dual-mockup-brief.md`) 기준으로 동시에 검토하고, **수정 없이 최종 선택 단계로 진행 가능한지** 판단한다.

## 안 A — 자체 목업 (코드)
- 스펙: `docs/design/diet-management-mockup-a-internal.md`
- 실행: `mock-internal/` → `npm install && npm run dev` → `http://localhost:5173/mock-internal/`
- 포함 화면: `APP_*` 앱 플로우, `ADM_*` 관리자 대시보드·목록(필터·15건·페이지네이션)
- 상태 UI: 화면별 `StatePicker` (기본/로딩/빈/오류/권한 등)

## 안 B — Stitch
- 스펙: `docs/design/diet-management-mockup-b-stitch.md`
- **projectId:** `7726060931590277332`
- **디자인 시스템 assetId:** `assets/1329886661735568102`
- 대표 스크린: `edd17276ff6d46e4b5ccb918c6b7918e`(홈), `07a9c65551c148d3b9ba1cd480a1718b`(페이월), `04b38f07d7a844bbbc64bf9d29589d83`(통계+구독), `9c137926c717437f918041b3a75c2abc`(대시보드+회원)

## 정합 요약
- `docs/design/diet-management-alignment-notes.md` 참고 (PRD 대비 양안 체크)

## HUMAN 중간 컨펌 질문
1. A/B 초안을 함께 검토한 뒤, **큰 수정 없이** 디자인 선택(비교표·Stage3 체크리스트 갱신) 단계로 넘어가도 될까요?
2. 추가 수정이 필요하면, **어느 안·어느 화면**부터 우선 보정할지 한 줄로 지정해 주세요.

## 다음 단계 (선택 승인 후)
- `docs/design/diet-management-design-options-comparison.md`에 선택안·제외안·일시 기록
- `docs/qa/stage3-entry-checklist.md` 디자인·Gate 2 준비 항목을 선택안 기준으로 체크
