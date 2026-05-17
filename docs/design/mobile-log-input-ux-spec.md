---
type: design-spec
project: dietManagement
status: approved
updated_at: 2026-05-17
parent_prd: docs/requirements/mobile-log-ux-improvements-prd.md
---

# 모바일 기록 입력 UX 스펙 v0.1 (67 면제 단일안)

## 0) 면제

기존 LogScreen + `Card`/`Segmented`/`theme.tsx` 재사용. 신규 라우트 0.

## 1) 섹션 순서

1. OCR 버튼
2. 템플릿 칩 (가로 스크롤)
3. 최근 먹은 음식 (가로 스크롤)
4. 끼니 Segmented
5. 수정 배너 (편집 시만)
6. 통합 입력 폼 (LabeledField)
7. 템플릿 분량 (템플릿 선택 시)
8. 저장 / 삭제(편집 시)
9. 최근 기록 목록 (행 탭 → 편집)

## 2) LabeledField

- 라벨: `fgMuted`, caption, 상단
- 입력: 기존 border 스타일
- placeholder는 보조

## 3) 수정 모드

- 배너: `info` — 「{음식명} 수정 중」
- Primary: 저장 | Secondary: 삭제
- 취소: 폼 reset (`editingMealId` null)

## 4) 상태

| 상태 | 표현 |
|------|------|
| 템플릿 로딩 | ActivityIndicator |
| 템플릿 없음 | muted 본문 |
| 저장 중 | PrimaryButton loading |
| 오류 | toast error |
