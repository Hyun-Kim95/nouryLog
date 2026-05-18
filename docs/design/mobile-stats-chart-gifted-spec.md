# 모바일 통계 칼로리 차트 (gifted-charts) v0.1

## 0) 67 dual-design 면제

| 조건 | 근거 |
|------|------|
| 좁은 스코프 | 신규 화면 0. `StatsScreen` 기존 카드 내 `CalorieRangeChart` 교체만 |
| SSOT | `apps/mobile/src/theme.tsx` 토큰, `GET /stats` 응답 `daily[]` |
| §0 명시 | 본 절 |

## 동작·상태

- 막대: 일별 kcal, `hasRecords` 없으면 최소 높이·`border` 색
- 색: `met` → primary, `under`/`over` → warn, 없음 → border/muted
- 목표: `calorieMin`/`calorieMax` 참조선(점선) + 구간 반투명 밴드
- 탭: 막대 탭 시 툴팁(날짜·kcal·상태·매크로), 재탭 시 해제
- 스크롤: 주·월 `BarChart` 내장 가로 스크롤

## 툴팁 레이아웃 (2026-05-18)

- 고정 높이 슬롯(88px) + 가로 스크롤은 막대 영역만 — 탭 시 세로 점프 없음.
- 미선택 시 `calorieChartTapHint` 안내 문구.

## 구현 (2026-05-18 운영 복구)

- dev client에 `ExpoLinearGradient` / `RNSVG` 미포함 시 주·월 통계에서 `IllegalViewOperationException` 발생.
- **현재:** `CalorieRangeChart`는 `View` 기반 직접 렌더(네이티브 차트 의존성 없음).
- gifted-charts 재도입 시 `expo install expo-linear-gradient react-native-svg` + **dev client 재빌드** 필수.
