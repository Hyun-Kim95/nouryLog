# PostHog 월간 점검 · 대시보드 · 발전 방향 분석

nouryLog 모바일 앱의 PostHog 운영 가이드입니다.  
데이터가 쌓인 뒤 **월 1회** 점검하고, 필요 시 에이전트(PostHog MCP)에 발전 방향 추천을 요청합니다.

**전제·가정 (product-monetization-default):** 사업자·유료 구독 기본 없음. 광고·후원 수준. 분석 목적은 **제품 개선·리텐션·기능 우선순위**이며, 결제·정산 KPI는 기본 범위 밖.

**구현 SSOT:** `apps/mobile/src/analytics/`  
**수집 ON 조건:** EAS `EXPO_PUBLIC_POSTHOG_ENABLED=true` + `EXPO_PUBLIC_POSTHOG_KEY` + production(또는 preview) **재빌드**

---

## 1. 공통 필터 (항상 적용)

shared PostHog 프로젝트를 다른 서비스와 공유하므로, 대시보드·인사이트·MCP 질의에 아래를 기본으로 둡니다.

| 필터 | 값 | 비고 |
|------|-----|------|
| `app` | `nourylog` | 앱 식별 (`ANALYTICS_APP_NAME`) |
| `environment` | `production` | 스토어·실사용자. 내부 APK 테스트는 동일 값일 수 있음 |
| 기간 | 지난 28일 (월간) / 7일 (주간 스팟) | 리텐션은 최소 14일 이상 수집 후 |

PostHog 프로젝트: [us.posthog.com](https://us.posthog.com) · 호스트 `https://us.i.posthog.com`

**보내지 않는 데이터:** 식단 내용, OCR 원문, 질문 본문 등 PII·민감 텍스트 (privacy v4·PRD 준수).

---

## 2. 대시보드 초안 — 「nouryLog · Product」

PostHog에서 대시보드 1개를 만들고 아래 인사이트를 고정합니다.  
(이름·순서는 그대로 써도 됩니다.)

### 패널 A — 활성 사용자

| # | 인사이트 유형 | 설정 |
|---|---------------|------|
| A1 | Trends | 이벤트 `app_opened` · 집계 **Unique users** · interval **day** · 필터 `app=nourylog`, `environment=production` |
| A2 | Trends | 동일 · interval **week** · 12주 lookback (WAU 추세) |
| A3 | Lifecycle | 기준 이벤트 `app_opened` · 주간 |

**볼 때:** DAU/WAU가 늘는지, 신규 vs 복귀 비율.

### 패널 B — 활성화 퍼널

| # | 인사이트 유형 | 단계 (순서) |
|---|---------------|-------------|
| B1 | Funnel | ① `app_opened` → ② `login_completed` → ③ `onboarding_completed` → ④ `meal_recorded` |
| B2 | Funnel | ① `login_completed` → ② `meal_recorded` (온보딩 스킵 사용자 포함) |

공통: conversion window **14일**, 필터 `app=nourylog`, `environment=production`.

**볼 때:** 어느 단계 drop-off가 큰지. `onboarding_completed` 속성 `skipped=true` 비율은 별도 Trends로 보조.

### 패널 C — 핵심 행동 (식단·OCR)

| # | 인사이트 유형 | 설정 |
|---|---------------|------|
| C1 | Trends | `meal_recorded` · total count · breakdown `input_mode` (`template` / `manual` / `ocr`) |
| C2 | Funnel | `ocr_started` → `ocr_completed` → `meal_recorded` (OCR 경로만: `meal_recorded` where `input_mode=ocr`) |
| C3 | Trends | `ocr_completed` · breakdown 속성 `edited_before_save` (true/false) |

**볼 때:** 수동 vs 템플릿 vs OCR 비중, OCR 신뢰도·수정률.

### 패널 D — 탐색·인사이트

| # | 인사이트 유형 | 설정 |
|---|---------------|------|
| D1 | Trends | `$screen_view` · breakdown `screen_name` · top 10 |
| D2 | Trends | `stats_viewed` · breakdown `period` (`day` / `week` / `month`) |
| D3 | Stickiness | 이벤트 `meal_recorded` · 주간 (몇 일 기록했는지) |

**볼 때:** Stats·Insight 화면은 많이 보는데 `meal_recorded`가 적으면 「탐색만 하고 기록 안 함」 가설.

### 패널 E — 로그인·버전·페이월

| # | 인사이트 유형 | 설정 |
|---|---------------|------|
| E1 | Trends | `login_completed` · breakdown `provider` |
| E2 | Trends | `app_opened` · breakdown `app_version` (배포 전후 비교) |
| E3 | Trends | `paywall_shown` · breakdown `trigger` (2차 구독·OCR 한도 정책 시) |

### 패널 F — (2차) 미구현 이벤트

아래는 코드·PRD에만 있거나 아직 미연동. 대시보드에 **placeholder**로 두고, 이벤트 추가 후 활성화.

| 이벤트 (예정) | 용도 |
|---------------|------|
| `meal_set_applied`, `meal_set_created` | 끼니 세트 사용률 |
| `weight_recorded` | 체중 추세 참여 |
| `insight_viewed` | 인사이트 카드 노출·조회 |
| `ad_impression`, `ad_click` | 광고 슬롯 (기본 수익 모델) |
| `ai_ask`, `ai_report_view` | AI RAG 2차 (본문 전송 금지) |

---

## 3. 월간 점검 체크리스트

매월 1회(또는 스프린트 종료 시) 아래를 순서대로 확인합니다.  
담당: **HUMAN** 리뷰 + 필요 시 **에이전트**(PostHog MCP) 보조.

### 3.1 수집·품질

- [ ] `app=nourylog` + `environment=production` 필터에서 **지난 7일** `app_opened` > 0
- [ ] 스토어 최신 `app_version`으로 이벤트가 들어오는지 (`app_version` breakdown)
- [ ] EAS production `EXPO_PUBLIC_POSTHOG_ENABLED=true` 유지 여부
- [ ] 이상 징후: 이벤트 급감(배포·장애), `app` 누락, 테스트 데이터만 증가

### 3.2 규모 (분석 가능 여부)

| 지표 | 월간 최소 (가이드) | 미달 시 |
|------|-------------------|---------|
| `login_completed` unique | 30+ | 퍼널은 참고만, 절대값 단정 금지 |
| `meal_recorded` total | 50+ | 입력 방식 비율·OCR 분석 보류 |
| 수집 기간 | 14일+ | 7일·14일 리텐션 해석 보류 |

### 3.3 퍼널·리텐션

- [ ] B1 퍼널: 가장 큰 drop-off 단계 기록
- [ ] `onboarding_completed` 중 `skipped=true` 비율
- [ ] Lifecycle: dormant / resurrecting 비율 변화
- [ ] Stickiness(`meal_recorded`): 주 2일 이상 기록 사용자 비율 추세

### 3.4 기능·UX 신호

- [ ] `meal_recorded` by `input_mode` — 주력 입력 방식
- [ ] OCR 퍼널 전환율, `edited_before_save=true` 비율
- [ ] `$screen_view` top 화면 vs `meal_recorded` 상관 (Stats·Log 이탈)
- [ ] `stats_viewed` by `period` — 사용자가 보는 기간 선호

### 3.5 배포·회귀

- [ ] 최근 production 배포일 전후 `app_opened`·`meal_recorded` 변화
- [ ] `login_completed` by `provider` — SNS 오류·비중 이상 없음

### 3.6 액션 기록 (월간 메모)

```text
월: YYYY-MM
DAU/WAU (대략):
퍼널 병목:
이번 달 관찰 1~3줄:
다음 달 실험/개선 후보 (우선순위 1~3):
에이전트 추천 요청 여부: Y/N
```

---

## 4. 발전 방향 추천 — 에이전트 요청 템플릿

데이터가 **§3.2 규모**를 넘기면, 채팅에 아래를 붙여 요청합니다.

```text
PostHog nourylog 데이터로 발전 방향 추천해줘.

필터: app=nourylog, environment=production, 기간=지난 28일
참고 문서: docs/qa/posthog-monthly-review.md

원하는 출력:
1. 관찰 요약 (숫자·퍼널·리텐션)
2. 가설 2~3개 (왜 이탈/저사용인지)
3. 개선 우선순위 Top 3 (UX / 기능 / 이벤트 보강)
4. 이번 달 하지 말아야 할 것 (데이터 부족·노이즈)
5. 다음 달까지 쌓으면 좋은 이벤트 (§2 패널 F)

제약: 식단·OCR 원문 분석 없음. 유료 구독·결제 기능은 기본 제안 제외.
```

### 추천 시 에이전트가 매핑하는 규칙 (러프)

| 신호 | 추천 방향 예 |
|------|----------------|
| `login_completed` 후 `meal_recorded` 급락 | 첫 기록 UX, 홈 CTA, 템플릿·끼니 세트 노출 |
| `input_mode=manual` 과다 | 템플릿·검색·OCR 온보딩 |
| OCR 시작 대비 완료 낮음 | OCR 실패 UI, quota 메시지, 수동 전환 |
| `edited_before_save` 높음 | OCR 정확도·확인 UI |
| Stats/Insight 조회 많고 기록 적 | 인사이트→기록 유도 플로우 |
| 7일 리텐션 낮음 | 알림·리마인더·홈 요약 카드 |
| 특정 `provider`만 이탈 | 해당 SNS 로그인 회귀 점검 |

---

## 5. 주간 스팟 체크 (5분, 선택)

월간 전에 빠르게 볼 때:

1. 지난 7일 `app_opened` unique
2. `meal_recorded` total
3. B1 퍼널 1·2단계 전환율만
4. 최신 `app_version` 이벤트 유무

---

## 6. 관련 문서

- [play-store-phase0.md](../release/play-store-phase0.md) — EAS PostHog env
- [privacy.md](../legal/privacy.md) — PostHog 위탁 (v4+)
- [feature-ai-rag-prd.md](../requirements/feature-ai-rag-prd.md) — 2차 AI 이벤트 정책
- 구현: `apps/mobile/src/analytics/events.ts`

---

## 7. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-01 | 초안 — 대시보드 6패널, 월간·주간 체크리스트, 에이전트 요청 템플릿 |
