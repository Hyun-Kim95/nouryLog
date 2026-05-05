---
type: design-decision-input
project: dietManagement
doc_lane: design
updated_at: 2026-05-05
tags: [design, comparison, option-a-b]
---

# 식단 관리 디자인안 A/B 비교표

## 비교 기준
- 구현 속도
- 상태 UI 적합성
- 다크모드 일관성
- 운영/확장성
- 리스크

## A/B 비교
- 안 A (자체 목업)
  - 장점: 빠른 구현 전환, 문서/개발팀 커뮤니케이션 단순
  - 단점: 디자인 시스템 일관성 유지에 추가 관리 필요
  - 적합: MVP 빠른 출시 우선
- 안 B (Stitch 기반)
  - 장점: 토큰/컴포넌트 일관성, 다크모드/상태 패턴 정리 용이
  - 단점: 초기 생성/수정 루프로 시간 증가 가능
  - 적합: 중장기 확장성과 UI 품질 우선

## 추천안
- 추천: **안 A 우선 + 안 B 병행 검토**
- 추천 이유:
  - 현재는 정책/과금/상태 요구가 이미 복잡해 구현 속도 확보가 중요
  - 동시에 B안을 유지하면 단계 3 이전에 시각적 일관성 리스크를 줄일 수 있음

## 동시 제시·중간 컨펌
- 패키지: `docs/design/diet-management-mid-confirm.md`
- 정합 점검: `docs/design/diet-management-alignment-notes.md`

## HUMAN 선택 선행 조건
- **안 A(자체 목업)는 로컬 실행으로 반드시 확인**한 뒤 선택안을 기록한다 (`mock-internal` · 아래 참조).
- 안 B(Stitch)는 동일 문서(`diet-management-mockup-b-stitch.md`)의 `projectId`·스크린 ID로 UI에서 병행 확인한다.

## HUMAN 선택 기록 (확정)
- 선택안: **안 B (Stitch 기반)**
- 선택 사유: 사용자 검토 결과 "Stitch 디자인이 더 예뻐보여"로 표현 품질을 우선해 B안을 채택.
- 제외안 사유: 안 A는 구현 전환 속도는 빠르나 시각 완성도·디자인 시스템 일관성 관점에서 우선순위가 낮음.
- 선택 일시: 2026-05-05 (KST)

## 실행 참조 링크 (선택 전)
- **안 A:** `mock-internal/` 로컬 목업 · 스펙 `docs/design/diet-management-mockup-a-internal.md`
- **안 B:** Stitch `projectId=7726060931590277332`, `assetId=assets/1329886661735568102` · 스펙 `docs/design/diet-management-mockup-b-stitch.md`
