---
type: doc
project: dietManagement
doc_lane: requirements
updated_at: 2026-05-05
tags: [requirements, index, prd-linked]
---

# 식단 관리 기능 초기 문서 세트 (PRD 기준)

## 목적
- `feature-diet-management-app-prd.md`를 구현 가능한 작업 단위 문서로 분리한다.
- Gate 2(병렬 구현) 전 계약/상태/운영 기준의 참조점을 제공한다.

## 기준 PRD
- `docs/requirements/feature-diet-management-app-prd.md`

## 문서 세트 구성
- 요구/정책 기준
  - `docs/requirements/feature-diet-management-app-prd.md`
- API 계약 상세
  - `docs/requirements/feature-diet-management-api-contract-v1.md`
- 상태/오류 처리 매핑
  - `docs/requirements/feature-diet-management-state-mapping.md`
- 초기 의사결정 기록(ADR 성격)
  - `docs/decisions/2026-05-05-diet-management-initial-decisions.md`
- QA 초기 시나리오
  - `docs/qa/feature-diet-management-test-scenarios-v1.md`
- Stage 3 진입 체크리스트
  - `docs/qa/stage3-entry-checklist.md`

## 운영 원칙
- PRD와 하위 문서가 충돌하면 PRD를 우선 갱신하거나, PRD 승인 후 하위 문서를 재동기화한다.
- API/정책 변경 시 문서 세트 전체에 동시 반영한다.
- 상태명/에러코드/필드명은 문서 간 동일한 표기를 유지한다.

## AI RAG 확장 (2026-06-03~)
- PRD: `docs/requirements/feature-ai-rag-prd.md` (**approved** 2026-06-03)
- API delta v1.11: `docs/requirements/api-contract-v1.11-ai-rag-delta.md`
- 벡터 SSOT: **PostgreSQL pgvector** (로컬·Railway 동일, Chroma 미사용)
- 로컬 가이드: `docs/agent/ai-local-demo.md`

## 다음 단계
- AI RAG 단계 3: `/me/ai/*` API + **user-web** MVP (`feature-ai-rag-prd.md` §15, `docs/design/user-web-ai-spec.md`)
- 디자인 선택(HUMAN) 완료 후 `stage3-entry-checklist`를 확정 값으로 전환한다.
- Gate 2 충족 시 `parallel-delivery` 기준으로 FE/BE 병렬 구현에 착수한다.
