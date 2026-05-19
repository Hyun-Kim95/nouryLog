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
| 좁은 스코프 | 통계 탭 **우측 상단 CTA → WeightHistory 스택 화면** + 온보딩/프로필 **ReferenceWeightCard** 1블록. `Card`, `Field`, `RadioGroup`, `CalorieRangeChart` 패턴 재사용. |
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

## 2) 체중 추이 진입·전용 화면

### 통계 탭
- `ScreenLayout` 제목 행 **우측** `TextButton` 「체중 추이」(`variant: info`)
- 탭 본문에는 체중 카드 없음

### WeightHistory 스택 화면
- 루트 스택 `WeightHistory`, 네이티브 헤더(뒤로), 제목 「체중 추이」
- 본문: `StatsWeightSection`(차트 + 최근 20건 + 「체중 기록」 + `WeightCheckInModal`)

| 상태 | UI |
|------|-----|
| 로딩 | Card 내 ActivityIndicator |
| 빈 | 안내 문구 + 「체중 기록」 PrimaryButton |
| 기본 | WeightTrendChart + 목록(날짜·kg) |
| 오류 | Banner + 재시도 |

## 3) WeightTrendChart

- `CalorieRangeChart`와 동일: 가로 스크롤, 툴팁, 다크 토큰
- 단일 시리즈(체중 kg), Y축 auto scale

## 4) 5상태

기본 / 로딩 / 빈 / 오류 / 권한(로그인 필요) — 기존 앱 패턴 따름.
