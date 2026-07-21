---
type: design-spec
project: dietManagement
status: approved
updated_at: 2026-07-21
approved_at: 2026-07-21
parent_prd: docs/requirements/feature-mobile-nutrition-autofill-prd.md
parent_design: docs/design/mobile-log-input-ux-spec.md
---

# 모바일 Log — 영양성분 DB 자동 채움 UX 스펙 v0.1 (67 면제 · approved)

> PRD: [`feature-mobile-nutrition-autofill-prd.md`](../requirements/feature-mobile-nutrition-autofill-prd.md) v0.3 **approved**.  
> **HUMAN 디자인 승인:** 2026-07-21 (= 구현 착수 승인).

## 0) 67 면제

| 항목 | 내용 |
|---|---|
| 스코프 분류 | 기존 LogScreen **슬롯 보강** (음식명 포커스 시 섹션 1개 + 초안 모드 필드). 신규 라우트 0 |
| SSOT | [`mobile-log-input-ux-spec.md`](./mobile-log-input-ux-spec.md) (승인됨) + 본 증분 |
| 재사용 | `LabeledField`, `Card`, `Segmented`, `theme.tsx`, PrimaryButton, 기존 suggestions 리스트 패턴 |
| 이중안 | **면제** (D-6). Stitch A/B 없음 |
| 다크모드 | 기존 토큰만. 신규 토큰 금지 |

## 1) 섹션 순서 (Log §1 삽입)

기존 순서 유지. **6. 통합 입력 폼** 내부/직하:

1. 음식명 `LabeledField`
2. (입력 중) **템플릿·과거 제안** 블록 — 기존
3. (q trim≥1) **영양성분 DB(식약처)** 블록 — 신규
4. 초안 모드 시: **섭취량(g)** `LabeledField` → 매크로 4종 → 출처 한 줄 → 잠금 힌트(해당 시)
5. 순수 수기일 때만 기존 「1인분 기준」힌트 (초안 모드에서는 **숨김**)
6. 템플릿 분량 UI는 템플릿 선택 시에만 (초안 모드와 동시 노출 **금지**)

## 2) 영양성분 DB 블록

| 요소 | 스펙 |
|---|---|
| 제목 | 「영양성분 DB(식약처)」 — `fgMuted` caption / 섹션 헤더 |
| 보조 | 「내 기록·템플릿과 별개」 |
| 행 | 음식명(본문) + 선택 시 category 또는 kcal/100g 힌트(동명 구분) |
| 최대 행 | 8 |
| 터치 | 행 전체 탭 → 초안 채움. min touch 44pt 권장 |
| 구분 | suggestions와 **시각적 분리**(간격 또는 미세 구분선). 아이콘만으로 구분 금지 |

## 3) 초안 모드 폼

| 필드 | 표시 |
|---|---|
| 섭취량 (g) | 숫자 키패드. 라벨 명확 |
| 칼로리·P·C·F | 기존 수기 필드 재사용, **총량** 의미. 소수 1자리까지 표시 가능 |
| 출처 | caption muted: 「식품의약품안전처 식품영양성분 DB 기반(일부)」 |
| 잠금 힌트 | 매크로 수동 수정 후: 「영양을 직접 수정했어요…」 |

## 4) 상태 (PRD §7 · §5.7)

| 상태 | 표현 |
|---|---|
| 기본 | q 없음 → DB 블록 비표시 |
| 로딩 | 목록 비움 + 섹션 내 ActivityIndicator |
| 빈 | muted 「검색 결과 없음」 |
| 오류 | 섹션 내 문구 + 재시도(텍스트 버튼). 전역 toast 남발 금지(검색 401) |
| q>60 | 인라인 「검색어는 60자까지」 |
| 초안 완료 | g·매크로·출처 표시 |
| 저장 중 | Primary loading (연타 무시) |
| 저장 오류 | 기존 Log toast error |

## 5) 반응형·플랫폼

- 모바일 앱(Log 탭)만. 웹 admin 비대상.
- 세로 스크롤 내 인라인. 별도 풀스크린 검색 없음.

## 6) 다크모드 체크리스트

- [ ] 섹션 제목·출처 `fgMuted` 대비
- [ ] 결과 행 pressed/구분선 가시
- [ ] 스피너·오류 문구 가시
- [ ] g 필드 보더 라이트/다크 동일 패턴

## 7) 시각 점검 (구현 후)

- [ ] suggestions와 DB 블록이 한눈에 구분됨
- [ ] 초안 모드에서 1인분 힌트·템플릿 분량 UI 없음
- [ ] OCR/템플릿/순수 수기 경로 레이아웃 회귀 없음

## 8) 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-07-21 | 67 면제 초안 |
| 0.1+승인 | 2026-07-21 | HUMAN 디자인 승인. 구현 착수 가능 |
