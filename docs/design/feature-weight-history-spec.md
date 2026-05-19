---
type: design-spec
project: dietManagement
status: approved
owner: design-system
updated_at: 2026-05-19
parent_prd: docs/requirements/feature-weight-reference-and-history-prd.md
version: 0.1
---

# 체중 이력·참고 체중 디자인 스펙 v0.1

## 0) 67 dual-design 면제

| 조건 | 근거 |
|------|------|
| 좁은 스코프 | 신규 라우트 0. 통계 탭 **하단 Card 섹션** 추가 + 온보딩/프로필 **ReferenceWeightCard** 1블록. `Card`, `Field`, `RadioGroup`, `CalorieRangeChart` 패턴 재사용. |
| SSOT | `apps/mobile/src/theme.tsx`, `mobile-onboarding-spec.md`, `StatsScreen`/`CalorieRangeChart` |
| 재사용 | `WeightCheckInModal`, `ScreenLayout`, `Banner`, `PrimaryButton` |

## 1) ReferenceWeightCard

- 배경 `surface2`, border `border`
- 제목: 「참고 체중 구간」
- 본문: `○○~○○ kg (BMI 18.5~23)`
- 보조: 현재 체중·BMI(있을 때)
- 힌트: suggestedGoal 기반 1줄(강제 선택 없음)
- `warnings` → `Banner` warn 톤
- caption: disclaimer (`fgSubtle`, caption)

## 2) Stats 탭 체중 섹션

| 상태 | UI |
|------|-----|
| 로딩 | Card 내 ActivityIndicator |
| 빈 | 안내 문구 + 「체중 기록」 PrimaryButton |
| 기본 | WeightTrendChart + FlatList(날짜·kg) |
| 오류 | Banner + 재시도 |

## 3) WeightTrendChart

- `CalorieRangeChart`와 동일: 가로 스크롤, 툴팁, 다크 토큰
- 단일 시리즈(체중 kg), Y축 auto scale

## 4) 5상태

기본 / 로딩 / 빈 / 오류 / 권한(로그인 필요) — 기존 앱 패턴 따름.
