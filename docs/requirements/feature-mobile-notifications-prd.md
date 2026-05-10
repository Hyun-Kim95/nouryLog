---
type: prd
project: dietManagement
status: approved
owner: product
updated_at: 2026-05-10
tags: [requirements, prd, mobile-app, notifications, phase-o]
decision_pending: false
version: 0.2
---

# 모바일 알림 본 기능 PRD (v0.2 — N1~N12 결정 완료, 단계 2 진입)

## 0) 진행 단계 안내 (client-project-lifecycle)

본 문서는 `.cursor/rules/70-client-lifecycle-default.mdc` + `client-project-lifecycle` 스킬에 따라 **Phase O** 산출물이다.

- **단계 1 (요구·PRD 정리)** — 완료 (2026-05-10, v0.1 → v0.2). §10 N1~N12 사용자 결정 완료.
- **단계 2 (디자인 — 67 dual-design 면제 단일안)** — 진입 중. 산출: `docs/design/mobile-notifications-spec.md` v0.1.
- **단계 3 (디자인 승인 게이트)** — 단계 2 산출 후 HUMAN 승인 대기.
- **단계 4 (구현 + 검증)** — 디자인 승인 직후 즉시 진입(70-client-lifecycle-default §2 — 중복 승인 미요구).

§10에 N1~N12 결정 결과가 반영되어 있다. 결정으로 인해 **신규 화면 0 + 신규 API 0** + **expo-notifications 로컬 알림 + 동적 권장량 미달 판정** 조합으로 확정.

## 1) 문서 목적

- 모바일 앱에서 **식사 시간 알림**과 **권장량 미달 알림** 두 가지 알림을 도입한다.
- 알림 권한 요청 시점, 데이터 저장 위치, 시간/메시지 정책, 알림 끄기/켜기 UI를 사전 확정한다.
- Settings 탭 §2.5 "알림 (준비 중 슬롯)"을 활성화한다.
- emergent-rule (B) PUT nullable clear, (C) 부팅 비동기 컨텍스트 미렌더 — 본 Phase에서 양쪽 모두 트리거가 발동될 가능성이 높아, 적용 시 **누적 카운트 ≥3 도달 시 정식 룰 승격 검토**를 본 PRD에서 명시한다.

## 2) 제품 목표 / 비목표

### 목표
- 사용자가 정해진 식사 시간(아침/점심/저녁)에 식단 기록을 잊지 않도록 환기한다.
- 하루 단백질·칼로리 권장량 미달 상태를 잠자기 전 사용자에게 알려, 다음 날 식단 계획에 반영하도록 돕는다.
- 알림은 사용자가 명시적으로 "켜고", 시간을 "직접 변경"할 수 있게 한다(opt-in).
- 권한 거부 / OS 알림 OFF 상태에서도 앱 자체 동작은 절대 막지 않는다.

### 비목표 (본 Phase에서 다루지 않음)
- 서버 푸시 알림(FCM/APNs) 발송 — Phase P 이후. 본 Phase는 **로컬 알림만**.
- 공지(관리자 발신) 푸시 알림 — Phase P+.
- 위젯, 잠금 화면 활동(Live Activity) — Phase Q+.
- 알림 클릭 시 딥링크로 화면 이동 — 본 Phase는 앱 진입까지만, 자동 이동 X.

## 3) 핵심 사용자 시나리오

1. 사용자가 Settings → "알림" 카드 탭 → 첫 진입 시 알림 권한 요청. 허용하면 카드에 식사·권장량 미달 토글 노출, 거부하면 안내 메시지 + iOS/Android 설정 앱으로 보내는 링크.
2. 사용자가 "식사 시간 알림" 토글 ON → 기본값 아침 08:00, 점심 12:30, 저녁 18:30이 즉시 스케줄링됨. 시간을 탭하면 시간 선택 모달 → 변경 후 재스케줄링.
3. 사용자가 "권장량 미달 알림" 토글 ON → 기본값 매일 21:00에 "오늘 단백질이 X g 부족해요" 같은 메시지가 한 번 발송됨(부족하지 않으면 발송하지 않음).
4. 사용자가 점심 12:30에 알림을 받고 앱 진입 → 자동 화면 이동 없이 마지막 화면(또는 홈)에 도착. 사용자는 직접 Log 탭으로 이동해 기록.
5. 사용자가 Settings → "알림" 카드 안 "모두 끄기" 버튼 → 두 알림 모두 즉시 OFF + 기존 스케줄 취소.

## 4) 범위 정의

### 4.1 MVP (핵심)
- expo-notifications 도입 + 로컬 알림 스케줄링.
- 식사 시간 알림 — 아침/점심/저녁 3개 시간대, 각각 ON/OFF + 시간 변경 가능.
- 권장량 미달 알림 — 1개 시간대(기본 21:00), ON/OFF + 시간 변경 가능, 단백질·칼로리 동시 판정.
- 알림 권한 요청 + 권한 거부 안내 + OS 설정 앱 진입 링크.
- Settings 탭 알림 카드 활성화(준비 중 → 본 카드).
- "모두 끄기" 일괄 OFF 버튼.
- 권장량 미달 판정용 로컬 계산(서버 호출 없음, 오늘 누적 섭취 vs `proteinGoalG`/`calorieGoalKcal` 비교).

### 4.2 후순위 / 별도 Phase
- 사용자별 식사 횟수 변경(예: 4끼/5끼) — 본 Phase 3끼 고정.
- 알림 클릭 시 딥링크 자동 이동 — 본 Phase 미포함.
- 서버 측 알림 환경설정 저장(디바이스 변경 시 동기화) — Phase P+.
- 다국어 알림 메시지 — 본 Phase 한국어 단일.
- 배지 카운트 — 본 Phase 미사용.

## 5) 기능 요구사항

### 5.1 알림 권한 흐름

| 단계 | 동작 |
|---|---|
| 진입 전 | Settings 탭 알림 카드 = "준비 중" 슬롯 그대로 (권한 요청 안 함) |
| 카드 첫 탭 | `Notifications.requestPermissionsAsync()` 호출 |
| 권한 허용 | 카드 안에 토글·시간 행 노출 |
| 권한 거부 | 카드에 "알림이 꺼져있어요. 기기 설정에서 알림을 켜주세요." 메시지 + "기기 설정 열기" 버튼(iOS: `Linking.openSettings`, Android: 동일) |
| 권한 미결정 (사용자가 모달 닫음) | 다시 카드 진입하면 재요청 가능 |

### 5.2 식사 시간 알림

- 트리거: 매일 정해진 시간 1회.
- 채널 (Android): `meal-reminder` (importance: DEFAULT, sound: 기본).
- iOS: 권한 1회 요청 후 동일 카테고리 사용.
- 메시지 (정적 한 줄, N3 결정 기다림 — 추천: **시점별 컨텍스트**):
  - 아침: "아침 식단을 기록해볼까요?"
  - 점심: "점심 식단을 기록해볼까요?"
  - 저녁: "저녁 식단을 기록해볼까요?"
- ON/OFF: 식사별 개별 ON/OFF가 아니라 **3개 묶음 ON/OFF + 각 시간 개별 변경**(MVP 단순화). 향후 분리 가능.
- 시간 변경: 시간 선택 모달(시간/분), 즉시 반영(취소 후 재스케줄링).

### 5.3 권장량 미달 알림

- 트리거: 매일 정해진 시간(기본 **20:00**, N4 결정) 1회.
- 채널 (Android): `nutrition-reminder` (importance: DEFAULT).
- 판정 로직(기기 내):
  1. 오늘 0시~알림 시간까지 등록된 meal 합계 조회 (`GET /meals?from=today&to=today` 또는 로컬 캐시 사용).
  2. `proteinSum < proteinGoalG` 또는 `calorieSum < calorieGoalKcal` 중 **하나라도 미달이면 발송**.
  3. 둘 다 충족하면 발송하지 않음(no-op).
  4. `proteinGoalG`/`calorieGoalKcal`이 null/0이면 발송하지 않음(권장량 미설정).
- 메시지: "오늘 단백질이 N g 부족해요" / "오늘 칼로리가 N kcal 부족해요" / 둘 다면 "오늘 단백질 N g, 칼로리 N kcal 부족해요" — 부족 항목만 한 줄.
- 트레이드오프: 백그라운드에서 매일 정확한 시각에 데이터를 가져와야 하므로, **`expo-background-fetch` 보조** 또는 알림 콘텐츠를 정적("오늘 식단을 점검해보세요")으로 두는 안 양립. 결정 항목 **N5b** 참고.

### 5.4 알림 끄기 / 일괄 OFF

- 카드 헤더 옆 "모두 끄기" 텍스트 버튼: 식사·권장량 미달 두 토글 모두 OFF + `Notifications.cancelAllScheduledNotificationsAsync()` 호출.
- 안내 토스트: "알림을 모두 껐어요." (info, 2초).

### 5.5 OS 알림 권한 변경 감지

- 앱이 포그라운드 복귀(`AppState` change → active) 시 `Notifications.getPermissionsAsync()` 재확인.
- 권한이 `granted` → `denied`로 바뀌면 카드 안 토글을 자동 OFF + 안내 메시지 노출.
- 토스트 알림은 발송하지 않음(노이즈 방지).

## 6) 데이터 / 저장

### 6.1 저장 위치 (N6 결정 대기)

추천: **(a) SecureStore-only** (MVP 단순화, 서버 API 신설 0).

| 키 | 값 타입 | 예 |
|---|---|---|
| `dm_notif_meal_enabled` | 'true' / 'false' / null | 'true' |
| `dm_notif_meal_breakfast` | 'HH:mm' / null | '08:00' |
| `dm_notif_meal_lunch` | 'HH:mm' / null | '12:30' |
| `dm_notif_meal_dinner` | 'HH:mm' / null | '18:30' |
| `dm_notif_nutrition_enabled` | 'true' / 'false' / null | 'true' |
| `dm_notif_nutrition_time` | 'HH:mm' / null | '20:00' |

`null` = 미설정(기본값 적용 + 첫 ON 시 기본값 저장).

### 6.2 서버 저장 (선택 — N6 결정에 따라)

서버 동기화를 택하면 `/me/notification-preferences` 신규:
- `GET /me/notification-preferences` — 현재 설정 조회
- `PUT /me/notification-preferences` — 부분 갱신(emergent-rule (B) PUT nullable clear 패턴 적용 예정)

스키마(예):
```ts
{
  mealEnabled: boolean | null,
  mealBreakfast: string | null,  // "HH:mm"
  mealLunch: string | null,
  mealDinner: string | null,
  nutritionEnabled: boolean | null,
  nutritionTime: string | null,
}
```

### 6.3 부팅 시 컨텍스트 (emergent-rule (C) 트리거 예상)

- 앱 부팅 시 `expo-notifications` 권한 상태 확인이 비동기.
- 컨텍스트 hydration 전까지 `null` 상태로 두고 화면 미렌더 — `theme.tsx` 패턴 재사용.

## 7) 알림 콘텐츠 (UI 문구)

| 종류 | 시각 | 제목 | 본문 |
|---|---|---|---|
| 식사 (아침) | 08:00 | "아침 기록 시간이에요" | "오늘 아침 식단을 빠르게 남겨볼까요?" |
| 식사 (점심) | 12:30 | "점심 기록 시간이에요" | "오늘 점심 식단을 빠르게 남겨볼까요?" |
| 식사 (저녁) | 18:30 | "저녁 기록 시간이에요" | "오늘 저녁 식단을 빠르게 남겨볼까요?" |
| 권장량 미달 | 20:00 | "오늘 식단 점검" | (동적, §5.3 판정 로직 결과) |

권장량 미달 동적 본문 후보:
- 단백질만 부족: "오늘 단백질이 약 {N} g 부족해요. 한 끼 더 챙겨볼까요?"
- 칼로리만 부족: "오늘 칼로리가 약 {N} kcal 부족해요. 가벼운 보충 식단을 고려해보세요."
- 둘 다 부족: "오늘 단백질 약 {P} g, 칼로리 약 {C} kcal 부족해요. 식단을 점검해보세요."

## 8) 상태 처리 (UI 공통)

| 상태 | Settings 탭 알림 카드 표현 |
|---|---|
| 기본 (권한 결정 안 됨) | "알림" 카드 — "기록 시간을 알려드릴까요?" + "알림 켜기" 버튼 |
| 권한 허용 | 토글 2개(식사/권장량 미달) + 시간 행 4개 + "모두 끄기" 텍스트 버튼 |
| 권한 거부 | 흐릿한 카드 + "기기 설정에서 알림을 켜주세요." + "기기 설정 열기" 버튼 |
| OS 알림 OFF 감지 | 권한 거부와 동일 표시 |
| 로딩 (권한 조회 중) | 카드 헤더 + 스켈레톤 1줄(짧음, 깜빡 방지) |

## 9) API 계약 (선택)

§6.2 결정에 따라 신규 추가될 수 있음. 본 PRD에서는 **결정 후 v0.2에서 스키마 확정**으로 둔다. 기본 추천(SecureStore-only)이면 신규 API 0.

## 10) 결정 결과 (HUMAN 승인 완료, 2026-05-10)

| ID | 항목 | 결정 | 비고 |
|---|---|---|---|
| N1 | 권한 요청 시점 | (b) Settings 알림 카드 첫 탭 | 추천 그대로. 사용자 의지 직전 요청 → 거부율 최소화. |
| N2 | 식사 시간 기본값 | (a) 08:00 / 12:30 / 18:30 | 추천 그대로. |
| N3 | 식사 알림 메시지 | (b) 시점별 컨텍스트 분리 (아침/점심/저녁) | 추천 그대로. |
| **N4** | **권장량 미달 시간 기본값** | **20:00** | **사용자 변경(21:00 → 20:00). 저녁 식사 직후 권장 시간 확보.** |
| N5a | 권장량 미달 판정 | (c) 단백질·칼로리 둘 다 (어느 하나라도 미달이면 발송) | 추천 그대로. |
| N5b | 본문 종류 | (a) 동적 (트리거 시 오늘 누적 데이터로 부족량 계산) | 추천 그대로. |
| N6 | 데이터 저장 위치 | (a) SecureStore-only | 추천 그대로. **신규 서버 API 0**. |
| N7 | Android 알림 채널 | (a) `meal-reminder` + `nutrition-reminder` 2채널 분리 | 추천 그대로. |
| N8 | 알림 끄기 UI | (b) 개별 토글 + "모두 끄기" 일괄 | 추천 그대로. |
| N9 | iOS/Android 배지 카운트 | (b) 미사용 | 추천 그대로. |
| N10 | 라이브러리 | (a) `expo-notifications` | 추천 그대로. Expo 공식. |
| N11 | 알림 설정 위치 | (a) Settings 탭 알림 카드 안에 인라인 | 추천 그대로. **신규 화면 0**. |
| N12 | 67 dual-design 면제 | **적용** (N11=a 결과로 자동 결정) | 좁은 스코프 + SSOT 존재 + §0 명시 충족. |

### 결정 조합 결과

- **신규 화면 0개** + **신규 서버 API 0개**.
- 기존 Settings 탭 §2.5 "알림 (준비 중 슬롯)" 카드를 **활성화**해 본 기능 모두 인라인 수용.
- 라이브러리: `expo-notifications` 1개 신규.
- 식사 시간 알림 3개(08:00/12:30/18:30, 시점별 컨텍스트 메시지) + 권장량 미달 알림 1개(20:00, 동적 본문).
- 권한 요청은 카드 첫 탭 시.
- 저장: SecureStore 6개 키 (§6.1).
- emergent-rule (B) PUT nullable clear는 본 Phase에서는 발동하지 않음(N6=a, 신규 PUT API 0). (C) 부팅 비동기 컨텍스트는 발동(권한 상태 hydration).

### 67 면제 §0 사전 정합

| 면제 조건 | 충족 근거 |
|---|---|
| 1. 좁은 스코프 | 기존 Settings 알림 카드 1개 활성화. 컴포넌트 신규 도입 0(기존 카드/Pressable/Field 재사용). 신규 화면 0. |
| 2. 디자인 SSOT 존재 | `apps/mobile/src/theme.tsx` 토큰 + `mobile-settings-tab-spec.md` v0.5 §2.5 슬롯 + Settings 탭 카드 패턴(카드 1·2·3·4) SSOT. |
| 3. 면제 사유 §0 명시 | `mobile-notifications-spec.md` v0.1 §0 에서 명시. |

## 11) 비범위 / 후속 트랙

- 서버 푸시(FCM/APNs) — Phase P+
- 공지 푸시 알림 — Phase P+
- 알림 클릭 → 딥링크 자동 이동 — Phase Q+
- 다국어 — 다국어 도입 후
- 식사 횟수 사용자 변경 — Phase R+

## 12) 성공 지표 (초안)

- 알림 토글 ON 사용자 비율 ≥ 30% (Phase O 종료 후 30일 기준).
- 식사 알림 클릭 후 30분 내 식단 기록 비율 ≥ 20%.
- 권장량 미달 알림 false-positive(실제로는 충족이었는데 발송) ≤ 5%.

## 13) 미확정 / 결정 후 v0.2에서 다룰 항목

- §10 N1~N12 결정 결과 확정 (HUMAN 승인 게이트).
- §6.2 서버 API 스키마 (N6 결정 후 필요 시).
- §5.3 권장량 미달 데이터 소스 — `/meals?from=today&to=today` 응답 시간 + 백그라운드 페치 (Android `expo-background-fetch`, iOS `BGAppRefresh`) 가능 여부.
- 알림 통계 측정 방법 (성공 지표 §12 측정용 — 본 Phase 또는 별도 Phase).

## 14) Gate 1 충족 점검 (v0.2 시점)

| 기준 | 상태 |
|---|---|
| PRD 또는 동등 범위 문서 | ✓ 본 PRD v0.2 |
| 화면 기준 (목업·스펙) | ⏳ 단계 2 산출 `mobile-notifications-spec.md` v0.1 작성 진행 중 |
| API 계약 초안 | ✓ N6=a SecureStore-only 결정 → 신규 API 0, 본 절 §6.1 키 6개로 충족 |

→ Gate 1: 단계 2 디자인 스펙 완료 시 **충족**. 디자인 승인(단계 3) 후 단계 4 구현 진입.

## 15) 변경 이력

- v0.1 (2026-05-10) — 초안. N1~N12 결정 항목 + 추천안 ★ 표기.
- v0.2 (2026-05-10) — N1~N12 결정 결과 반영(§10), N4=20:00 사용자 변경, 본문(§5.3, §6.1, §7) 동기화, 67 면제 §0 사전 정합 명기, Gate 1 점검표 갱신.
