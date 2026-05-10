---
type: design-spec
project: dietManagement
doc_lane: design
updated_at: 2026-05-10
tags: [alignment, admin, stitch, gap]
---

# Stitch 신규 화면 ↔ admin-web 현재 구현 갭 (2026-05-08, 2026-05-10 18회 갱신)

> 2026-05-10 (18회차) 갱신: **Phase Q+R+S+T+U+V 일괄 진행 완료(Next Action Roadmap 6단계).** (Q) phase-n 14/14 + phase-p 9/9 + server·mobile·admin-web tsc clean(실 디바이스 시각 점검은 사용자 환경 위임). (R) `scripts/dev-smoke/all.mjs` 통합 러너 + 루트 `package.json` `smoke:dev`/`:n`/`:p`/`:t` 스크립트 추가. (S) `apps/mobile/src/theme.tsx` `warn` 토큰에 의미 주석 보강(별도 신규 토큰 추가 없음 — 67 좁은 스코프 유지) + `ProfileEditScreen` warnings 행 색상을 `t.colors.warn`으로 적용 + `recommendation-v14-spec.md` v0.3. (T) **사용자 override 입력 — 67 면제 단일안**: `feature-recommendation-override-prd.md` v0.1(7개 결정 일괄 채택, O1~O7) + `recommendation-override-spec.md` v0.2(구현 완료). 모바일 3파일(`api/profile.ts` `ProfileInput`에 두 숫자 필드 추가 + `copy/recommendation.ts` `OVERRIDE_COPY` 11키 + `ProfileEditScreen.tsx` 권장량 카드 하단 토글/입력 2개/reset/medicalGeneric warning). 서버 변경 0(기존 `PUT /me/profile` 검증·저장 경로 재사용, 마이그레이션 0). dev smoke `scripts/dev-smoke/phase-t.mjs` 7/7 신규. (U) HomeScreen/StatsScreen이 권장량 자체를 미노출하므로 안내 확장 보류 결론(스펙 §11.3에 기록, StatsScreen 권장량 충족률 도입 시 함께 다룸). (V) **release-check 통과**: server build(`prisma generate && tsc`) + admin-web build(`tsc -b && vite build`) + api-client build(`openapi-typescript && tsc`) + mobile `tsc --noEmit` 모두 clean. 통합 smoke `phase-n 14/14 + phase-p 9/9 + phase-t 7/7 = 30/30 PASS`. emergent-rule (A)는 G·H·I·J·L·O·P·**S**·**T**까지 누적 적용. 다음 후보는 Phase W(StatsScreen 권장량 충족률 + warnings 1줄 노출 — 별도 트랙).

> 2026-05-10 (17회차) 갱신: **Phase P/B4 단계 4 — 권장 계산 v1.4 구현 완료.** 디자인 스펙 v0.1 사용자 승인("쭉 진행해") 그대로 자동 진행. (1) **백엔드** — `apps/server/src/lib/recommendation.ts` 전면 갱신: `calculateRecommendationFull()` 신설(`AgeBand`/`CalorieMode`/`WarningCode`/`RecommendationPolicy`/`RecommendationMeta`/`RecommendationFull` 신규 타입 export). 청소년(`<19`) → `calorieMode='maintain_with_caution'` + delta 0 + `teen_caution`, 성인 → 기존 lose/gain delta(±300) 유지하되 단순 multiplier에서 절대 delta로 변경, 고령(`65+`) → delta clamp |Δ|∈[150,300] + 단백질 최소 1.1 g/kg + `older_adult_caution`, 자동 단백질 상한 2.0 g/kg/day, 칼로리 floor male 1500 / female·unspecified 1200 위반 시 floor + `low_calorie_floor_applied`. v1.3 호환 `calculateRecommendation()`은 시그니처 유지(`calculateRecommendationFull` 위임). `apps/server/src/routes/me.ts` — R1 결정에 따라 `GET /me/profile` 응답에 `recommendationVersion`/`policy`/`warnings` 메타 추가, `POST /me/recommendation/recalculate`도 동일 메타 응답. 저장 필드는 기존 `proteinGoalG/calorieGoalKcal` 두 개만(스키마 마이그레이션 0). (2) **모바일** — `apps/mobile/src/api/profile.ts`에 `AgeBand`/`CalorieMode`/`WarningCode`/`RecommendationPolicy`/`RecommendationMeta` export + `ProfileGetResponse`/`RecommendationResult`에 옵셔널 메타 결합(서버 v1.3 호환). `apps/mobile/src/copy/recommendation.ts` 신규(스펙 §3 카피 8키 SSOT + `WARNING_COPY` 매핑 + `sortedWarnings()` teen→older→floor→generic 정렬·중복 제거 헬퍼). `ProfileEditScreen` 권장량 카드 — 라벨 행 `flexDirection:'row'`/`space-between` + 우측 `versionTag` (`accessibilityLabel="권장 계산 버전 v1.4"`) + 추정 보조 줄(`estimate`) + warnings 행(`sortedWarnings(...).map`). 상태 갱신 GET·recalc 모두 warnings/version까지 setState. `OnboardingScreen` success 토스트 본문을 `RECOMMENDATION_COPY.onboardingDone`로 교체(저장 직후 결과 카드 신설은 67 좁은 스코프로 미채택). `NotificationCard` "권장량 미달 알림" ToggleRow 직후 `notifHelper` 줄 추가(`fgSubtle`/caption/`paddingHorizontal: t.spacing.md`, OFF 상태에서도 동일 톤). 식사 알림 helper 미추가. (3) **검증** — `scripts/dev-smoke/phase-p.mjs` 신규(9 케이스: login, GET 메타 포함, teen `maintain_with_caution`, GET 메타 매칭, adult deficit -300, older delta clamp + protein bump, low BMR floor 1200, profile 원상복구) → 9/9 PASS. `phase-n.mjs` 회귀 14/14 PASS(v1.1~v1.3 무영향 확인 + recalc 응답에 v1.4 메타 자동 노출 부수 효과 확인). `tsc --noEmit` server 6.6s clean / mobile 6.6s clean. ReadLints 7파일 clean. (4) **문서 동기화** — `recommendation-v14-spec.md` v0.1 → v0.2(`status: implemented`, §11 구현 산출물 + §11.2 구현 중 결정 4건 + §11.3 차후 트랙 후보 + §12 자체 시각 점검 14/14), 모체 PRD §15 Phase P 행 갱신, 본 헤더 17회차. emergent-rule (B) 본 Phase 미발동(신규 PUT nullable 필드 0, 메타는 응답 전용). (C) 미발동(부팅 컨텍스트 변경 0). 67 §0 적용 사례에 P 추가(스펙 §0 + 구현까지 단일안). 신규 dev smoke 스크립트 1개, 신규 모바일 모듈 1개, 신규 서버 export 6타입. **단계 5(고객 검수/QA) 진입 가능** — 사용자 다음 지시 대기.

> 2026-05-10 (Phase P/B4 단계 2 진입 메모): **PRD v0.1 → v0.2 사용자 승인("전부 추천대로 진행해", R1~R7 모두 추천안 채택) + 67 dual-design 면제 단일안 디자인 스펙 v0.1 작성 완료.** 디자인 승인 게이트(단계 3) 대기 중. 결정 결과 — R1=`GET /me/profile`에도 `recommendationVersion`/`policy`/`warnings` 메타 포함, R2=청소년(`<19`) `calorieMode='maintain_with_caution'` + `warnings.teen_caution`, R3=고령(`65+`) 칼로리 delta clamp(150,300) + 단백질 최소 1.1 g/kg + `warnings.older_adult_caution`, R4=칼로리 floor male 1500 / female·unspecified 1200 자동 추천 한정, R5=단백질 자동 상한 2.0 g/kg/day, R6=ProfileEdit 권장량 카드 + Onboarding 완료 토스트 본문 + Settings 알림 카드 미달 토글 helper 3곳 모두 노출, R7=67 면제 단일안. 67 면제 §0 사전 정합: (1) 좁은 스코프(신규 화면 0, 신규 컴포넌트 0, 기존 카드 텍스트 행/warnings 행만 추가), (2) 디자인 SSOT(`theme.tsx` 토큰 + `mobile-profile-extra-spec.md` 권장량 카드 + `mobile-onboarding-spec.md` 결과 카드 + `mobile-notifications-spec.md` v0.2 토글 helper), (3) 본 스펙 §0 명시 모두 충족. 디자인 단일안의 5+1 상태(기본/청소년/고령/floor/다중/recalc 실패), 토큰 매핑, 카피 8키(`copy.estimate` 등), 14항 시각 점검까지 사전 명세 완료. 신규 산출: `docs/requirements/feature-recommendation-v14-prd.md` v0.2 + `docs/design/recommendation-v14-spec.md` v0.1. 단계 4 산출 예정: `apps/server/src/lib/recommendation.ts` v1.4 정책표 + `GET /me/profile`·`POST /me/recommendation/recalculate` 응답 메타 추가 + ProfileEdit/Onboarding/NotificationCard 카피 변경 + 회귀 dev smoke. emergent-rule (B)·(C) 본 단계 모두 미발동(문서만 변경, 신규 PUT 없음, 부팅 컨텍스트 변경 없음). 67 §0 적용 사례 +1.

> 2026-05-10 (Phase P/B4 단계 1 진입 메모): **권장 계산 v1.4에 필요한 의학·영양 기준 정보는 에이전트가 공개 근거를 조사해 추가**했다. 신규 근거 문서 `docs/research/recommendation-v14-evidence.md` 작성 — National Academies DRI(성인 단백질 RDA 0.8 g/kg, AMDR), KDRI 2020(성인 단백질 RNI 0.91 g/kg), ISSN 2017(운동 성인 1.4~2.0 g/kg), ESPEN(고령 1.0~1.2 g/kg), Mifflin-St Jeor 근거/한계, NIH/NIDDK 계열의 보수 감량 기준, 청소년 제한식 주의 근거를 수집. 이를 바탕으로 `docs/requirements/feature-recommendation-v14-prd.md` v0.1 초안 작성 완료. v1.4 추천 정책 초안: Mifflin-St Jeor 유지, 칼로리는 목표별 단순 multiplier에서 bounded delta로 변경, 청소년(`<19`)은 maintain-oriented + caution, 고령(`65+`)은 보수 delta + protein minimum bump, 자동 단백질 상한 2.0 g/kg/day, 칼로리 floor male 1500 / female·unspecified 1200, `policy/warnings` 메타 응답 추가 제안. 현재는 client-project-lifecycle 단계 1 PRD 초안 상태이며 **HUMAN PRD 승인 게이트 대기 중**. 구현/목업 시작 0. emergent-rule (B)·(C) 추가 누적 0건(문서만 변경).

> 2026-05-10 (15회차) 갱신: **Phase O 단계 4 — 모바일 알림 본 기능 구현 완료.** PRD v0.2 + 디자인 스펙 v0.1 (67 면제 단일안) 그대로 자동 진행. 트랙 분담 I1~I6 모두 완료. (1) **I1 — `expo-notifications@~0.32.17` 설치(`npx expo install`로 SDK 54 호환 버전 자동 선택) + `app.json` 플러그인 등록(`color: #16a34a`) + 부팅 setup**(`apps/mobile/src/notifications/setup.ts` 신규 — 포그라운드 핸들러 + Android 채널 2개 `meal-reminder`/`nutrition-reminder` `DEFAULT` importance 등록 + 권한 조회/요청 래퍼). (2) **I3 — `apps/mobile/src/notifPrefs.ts` SecureStore 모듈** 신규(6개 키 + getter/setter + 5분 단위 분 정규화 + `loadAllNotifPrefs` 스냅샷 + `disableAll` 일괄). (3) **I2 — `apps/mobile/src/notifications/`**: `messages.ts`(시점별 식사 본문 + 둘 다 미달 동적 본문 빌더) + `nutrition.ts`(`/me/profile` + `/meals?page=1&size=100` 응답으로 오늘 누적 vs 목표 비교 → 부족량 계산, expo-background-fetch 미도입 — 단순화) + `scheduler.ts`(daily SchedulableTrigger + `reconcileScheduledNotifications` for AppState foreground 진입). (4) **I4 — `SettingsScreen` 카드 3 본문 교체**: 기존 "준비 중" 점선 슬롯 제거 → `apps/mobile/src/screens/settings/NotificationCard.tsx` 신규(화면 내 sub-section 분리, 신규 컴포넌트 도입은 아님 — 67 면제 정합 유지). 5상태(A~E) 렌더 + 자체 ScrollView 휠 시간 모달(시 24행, 분 12행 5분 단위, snapToInterval) + AppState foreground 진입 시 권한 재확인 + 자동 OFF + reconcile + 토스트 정합 8케이스. (5) **검증** — `tsc --noEmit -p apps/mobile/tsconfig.json` ko 5.0s + ReadLints clean + Phase N dev smoke 14/14 PASS(서버 회귀 영향 0 확인). (6) **I6/I5 — 문서 동기화** 디자인 스펙 v0.1 → v0.2(구현 결과 반영, §11 단계 4 트랙 → "완료" 표기), 시각 점검 누적 v0.3 → v0.4(§10 알림 본 기능 14항 신규 + §6 알림 슬롯 1항 deprecated, 합산 78→92, 실효 90), 모체 PRD §15 Phase O 행 갱신. emergent-rule (B) 본 Phase 미발동 확정(N6=a SecureStore-only로 신규 PUT API 0). (C) 부팅 비동기 컨텍스트 — App.tsx에 `setupNotifications()` 추가했지만 권한 hydration은 NotificationCard 내부 `permState='loading'` 상태로 처리(부팅 단계 차단 X). 기존 부팅 패턴 그대로라 추가 누적 0건. 1회 유지.

> 2026-05-10 (Phase O 단계 2 진입 메모): **PRD v0.2 사용자 승인(N1~N12 결정 완료) + 67 dual-design 면제 단일안 디자인 스펙 v0.1 작성 완료.** 디자인 승인 게이트(단계 3) 대기 중. 결정 결과 — N4 권장량 미달 시간 20:00(사용자 변경, 추천 21:00에서 변경)을 제외한 N1~N3, N5~N12는 모두 추천안 그대로. 67 면제 §0 사전 정합: (1) 좁은 스코프(기존 Settings 알림 카드 1개 활성화, 신규 화면 0, 신규 컴포넌트 0, expo-notifications 1개 외부 SDK만 신규), (2) 디자인 SSOT(`theme.tsx` + `mobile-settings-tab-spec.md` v0.5 §2.5 슬롯), (3) 본 스펙 §0 명시 모두 충족. 디자인 단일안의 5상태(A 권한 결정 안 됨 / B 허용 / C 거부 / D 로딩 / E OS OFF 감지), 시간 선택 모달, 토큰 매핑(라이트·다크), 토스트 정합, 시각 점검 체크리스트, 단계 4 분담(I1~I6)까지 사전 명세 완료. emergent-rule (B) 본 Phase 미발동 확정(N6=a SecureStore-only). (C) 부팅 권한 hydration에서 발동 예상 — 단계 4 구현 시 누적 1→2회. 신규 산출: `docs/requirements/feature-mobile-notifications-prd.md` v0.2 + `docs/design/mobile-notifications-spec.md` v0.1.

> 2026-05-10 (Phase O 단계 1 진입 메모): **client-project-lifecycle 단계 1(요구·PRD) 진입.** `docs/requirements/feature-mobile-notifications-prd.md` v0.1 초안 작성 완료, HUMAN 승인 게이트 대기 중. N1~N12 결정 묶음 형태로 한 번에 답변 가능하게 정리(추천안 ★ 표기). 결정 후 §10 결과에 따라 단계 2(이중 디자인 또는 67 면제) 진입. 본 게이트 통과 전에는 구현 코드 작성 0(70-client-lifecycle-default §3 준수). emergent-rule (B)·(C) 동시 발동 예상으로 본 Phase 종료 시 누적 ≥3 도달 가능성, 정식 룰 승격 검토 트리거 예정.

> 2026-05-10 (14회차) 갱신: **Phase N — A2 모체 PRD §15 "구현 진행 이력" 신설 + A3 dev smoke 회귀 점검** 두 트랙을 자동 진행으로 마감했다. Phase O(알림) 진입 전 안전망 묶음. (1) `feature-diet-management-app-prd.md`에 §15를 신설해 1~13회차 / Phase A~M을 한 표(회차·Phase·날짜·트랙 요약·주 산출)로 단일 정리하고, emergent-rule 누적 상태 + 다음 Phase 후보(N/O/P)도 본 절에 포함했다. 흩어져 있던 §9 회차별 메모를 단일 진입점화. (2) `scripts/dev-smoke/phase-n.mjs`(Node 18+ 내장 fetch 기반)를 신규 작성해 v1.1(admin) + v1.2(mobile profile) + v1.3(profile extra + recalc) 회귀 14 케이스를 자동 검증했다. 결과: **14/14 PASS** — user 로그인, GET `/me/profile` v1.3 필드, PUT `/me/profile` nullable clear/explicit, POST `/me/recommendation/recalculate`(Mifflin-St Jeor → `proteinGoalG=65, calorieGoalKcal=2465` 안전 기본값), v1.2 422 검증, admin 로그인, `/admin/dashboard|foods|inquiries|notices` 200, USER → admin 403 모두 정상. 본 스크립트는 Phase O/P 진입 시점에도 동일하게 재사용 가능. emergent-rule (B)·(C) Phase N 점검 결과 추가 누적 0건(문서 + 스크립트만 변경). 모체 PRD `updated_at` 2026-05-09 → 2026-05-10.
>
> 2026-05-10 (13회차) 갱신: **Phase M — Settings 탭 "계정" 카드 신설(B1) + MainTabs Ionicons 업그레이드(B2)** 두 트랙을 자동 진행으로 마감했다. (1) `SettingsScreen.tsx`에 4번째 카드 "계정"을 신설했다. 일반 사용자용 로그아웃 UI가 없던 상태에서 신규 추가(DevPanel "강제 로그아웃"은 개발자용으로 그대로 유지). 사용자 이메일은 GET `/me/profile`이 미반환 + SecureStore 저장 흐름 부재로 표시 생략, 안내 카피 1줄 + danger 톤 "로그아웃" 풀폭 버튼 + `Alert.alert` 확인 다이얼로그 + `clearTokens()` + `navigation.reset({ Login })` + info 토스트 "로그아웃했어요." 흐름. (2) Phase L의 텍스트 이모지를 `@expo/vector-icons@^15.0.3` Ionicons로 교체했다. focused/unfocused 짝(home/home-outline, restaurant/restaurant-outline, stats-chart/stats-chart-outline, card/card-outline, settings/settings-outline)을 명시 매핑하고 `tabBarActiveTintColor`/`tabBarInactiveTintColor` 정합으로 v0.4까지의 `opacity` 분기를 제거했다. settings-tab-spec v0.3 → v0.4(§2.7 카드 4 신설 + §11 점검 +3) → v0.5(§13.1~5 Ionicons 업그레이드 + §13.5 시각 점검 갱신). emergent-rule (B)·(C) Phase M 점검 결과 추가 누적 0건. tsc(`apps/mobile`) ✓ (5.4s, 5.8s), lint clean, `npx expo install` ✓ (~31s).
>
> 2026-05-09 (12회차) 갱신: **Phase L — 시각 점검 누적 체크리스트 통합 + MainTabs 5탭 아이콘 도입** 두 묶음을 자동 진행으로 마감했다. (1) `docs/design/visual-inspection-cumulative.md` v0.1을 신설해 6개 디자인 스펙(`mobile-onboarding`, `mobile-profile-extra`, `mobile-theme-toggle`, `mobile-toast`, `mobile-settings-tab`, `admin-toast`) + admin-stitch-gap dev smoke § 항목을 카테고리별 68 항목으로 통합했다(직전 추정 "47"보다 21 항목 더 많음을 발견 — 직전 보고는 4개 스펙만 카운트했음). (2) `apps/mobile/src/navigation.tsx` MainTabs 5탭(Home🏠/Log📝/Stats📊/Sub💳/Settings⚙️)에 텍스트 이모지 + 라벨 + 다크 정합 토큰을 도입했다. `@expo/vector-icons` 미설치 확인 후 의존성 추가 0으로 즉시 적용 가능한 이모지 채택, 향후 정교한 아이콘은 별도 트랙. settings-tab-spec v0.3 §13 신설로 67 면제·매핑·시각 인터랙션·접근성·체크리스트 6 항목 명세. 누적 합산 68 → 74(실효 73). tsc(`apps/mobile`) ✓ (4.76s), lint clean.
>
> 2026-05-09 (11회차) 갱신: **Phase K — `borderStrong` 토큰 도입 + emergent-rule (B)·(C) 누적 점검** 두 묶음을 자동 진행으로 마감했다. (1) 모바일 `theme.tsx`에 `borderStrong` 토큰을 신규 추가(light `#cbd5e1` / dark `#475569`)하고 SettingsScreen 알림 슬롯 점선 보더에 적용, admin-web `--ds-border-strong`(light `#cbd5e1` / dark `#3f4750`)와 의미·역할 정합을 닫았다. 헥스값은 admin-web의 GitHub-기반 다크 톤과 모바일 슬레이트 다크 톤이라 베이스 팔레트 차이로 다크 값만 다르고, 동일 의미("border 한 단계 위 강조")는 양 플랫폼이 같다. mobile-settings-tab-spec.md §2.5/§2.6/§12를 v0.2로 동기화. (2) emergent-rule 후보 (B)·(C)의 직전 7개 트랙(2~8) 적용 사례를 점검한 결과 모두 추가 누적 0건으로 확인됐다. 자동 판단 결과 (B)·(C) 모두 누적 1회 유지 → 임시 가이드 유지, 정식 룰 승격 보류. 후보 § 본문에 다음 트리거(B: 새로운 nullable PUT clear 의미론 사례 / C: 새로운 부팅 비동기 컨텍스트 사례)를 명시해 후속 트랙에서 자동 점검 가능하도록 했다. tsc(`apps/mobile`) ✓ (5.0s), lint clean.
>
> 2026-05-09 (10회차) 갱신: **Phase J — Settings 탭 신설 + LoginScreen 다크모드 정합** 두 묶음을 자동 진행으로 마감했다. (1) 모바일에 5번째 탭 "설정"이 신설돼 ProfileEdit 진입과 테마 토글이 Subscription 탭에서 분리됐고 알림 설정 슬롯이 "준비 중" 점선 카드로 예약됐다. SubscriptionScreen은 구독·복구 본연의 책임으로 환원. (2) 모바일 LoginScreen의 하드코딩 색상이 `useTheme()` 토큰으로 교체돼 라이트/다크 정합이 닫혔다. SNS 브랜드 색(naver/google/kakao)은 인지성을 위해 의도적으로 그대로 유지. tsc(`apps/mobile`) ✓ (5.1s, 5.0s), lint clean. 사용자 명시 승인은 "쭉 진행" 의향으로 갈음(PRD `feature-mobile-settings-tab-prd.md` v0.1 자동 채택).
>
> 2026-05-09 (9회차) 갱신: 토스트 공통화의 자연스러운 마무리로 **양 플랫폼 LoginPage/LoginScreen 토스트 적용**이 완료됐다. admin-web `LoginPage`는 로그인 성공/실패 모두 토스트 발화, 기존 인라인 banner 보존. 모바일 `LoginScreen`은 이메일 로그인·SNS 로그인(취소/성공/충돌/실패)·계정 충돌 해결(연결/분리/실패) 모든 분기에 success/info/error 토스트 발화. ToastProvider가 NavigationContainer/Routes 바깥에 마운트되어 화면 전환 후에도 토스트 가시성 유지. tsc(`apps/admin-web` + `apps/mobile`) 통과, lint clean, vite build ✓ (268.78KB JS · 297ms).
>
> 동시에 **Settings 탭 신설 PRD v0.1**가 작성됐다(`docs/requirements/feature-mobile-settings-tab-prd.md`). Subscription 탭 안 카드로 임시 도입돼 있던 ProfileEdit 진입 + 테마 토글을 별도 "설정" 탭으로 분리하기 위한 청사진. 결정 8항목(S1~S8) "쭉 진행" 추천안 자동 적용. 67-dual-design-exemption §0 면제 사전 정합 명시. 디자인 스펙 + 구현은 사용자 명시 승인 후 별도 Phase J에서 진입.
>
> 2026-05-09 (8회차) 갱신: **admin-web 토스트 시스템 v0.1** 트랙이 구현·검증을 마쳤다. `apps/admin-web/src/toast/` 모듈(ToastProvider + useToast) + `index.css` `.toast-*` 스타일 + 4페이지 mutation 사용처(FoodsPage 저장/상태 + InquiriesPage 답변/상태/비활성 + NoticesPage 저장/상태 + DashboardPage 재집계)에 토스트가 도입되어, 모바일 v0.1과 동일 정책 + admin-web 표준(top-right 위치, 스택 최대 3개 큐잉)으로 양 플랫폼 결과 메시지 패턴이 공통화됐다. 본 트랙도 67-dual-design-exemption 면제 적용(단일 오버레이 보강 + 기존 `--ds-*` 토큰·`.banner-*` 패턴 재사용). tsc 통과, lint clean, vite production build ✓ (268KB JS · 18KB CSS · 1.1s). 모바일 트랙과 합쳐 토스트 공통화 완료.
>
> 2026-05-09 (7회차) 갱신: 모바일 **토스트 시스템 v0.1** 트랙이 구현·검증을 마쳤다. `apps/mobile/src/toast/` 모듈(ToastProvider + useToast)과 5사용처(Onboarding 저장 성공/저장 실패/recalc 실패 + ProfileEdit 저장 성공/저장 실패)에 토스트가 도입되어, 직전 두 트랙(E·F)에서 인라인 텍스트로만 가능했던 결과 메시지 한계가 해소됐다. 본 트랙은 67-dual-design-exemption 면제 적용(단일 오버레이 보강 + 기존 토큰/SafeAreaProvider/Animated.View 재사용)을 받아 안 A 와이어를 면제했다. tsc(`apps/mobile`) 통과, lint clean. 시각 점검은 `docs/design/mobile-toast-spec.md` §11 체크리스트 10 항목으로 위임.
>
> 2026-05-09 (6회차) 갱신: emergent-rule 후보 (A) "단일 스텝/소형 모바일 화면 또는 기존 컴포넌트 재사용 단일 카드 보강은 65-design-gate 안 A 면제 가능"이 정식 룰로 승격되어 `.cursor/rules/67-dual-design-exemption.mdc`로 분리 신설됐다(65 본문 변경 0). 후보 § (A) 줄은 정식 룰 승격 표기로 갱신, (B)·(C)는 적용 1회로 임시 가이드 유지. 65↔67↔60↔70 정합 점검 결과 충돌 없음(우선순위는 67이 65와 동일 단계, 70 흐름은 별도 정의).
>
> 2026-05-09 (5회차) 갱신: 모바일 **테마 사용자 토글 v0.1** 트랙이 구현·검증을 마쳤다. `apps/mobile`에 `userPrefs.ts`(SecureStore `dm_theme_mode`)와 `theme.tsx` 변경(부팅 시드 + 사용자 모드 영속 + DevPanel/사용자/시스템 우선순위)이 들어갔고, Subscription 탭의 "내 프로필" 카드와 "구독 · 복구" 사이에 라이트/다크 Segmented 카드를 노출했다. UI는 `light`/`dark` 2개만 노출(시스템 옵션은 첫 부팅 시드에만 1회 사용). admin-web은 이미 자체 토글·저장이 충족된 상태라 모체 PRD §9 비기능 항목이 양 플랫폼에서 모두 충족됐다. tsc(`apps/mobile`) 통과, lint clean. 시각 점검은 사용자 환경 의존이라 본 트랙에서는 제외하고 `docs/design/mobile-theme-toggle-spec.md` §12 체크리스트 10 항목으로 위임.
>
> 2026-05-09 (4회차) 갱신: 모바일 **프로필 확장(활동량·목표) v1.3** 트랙이 구현·검증을 마쳤다. Onboarding에 활동량 4 라디오·목표 3 라디오를 추가하고, 신규 `ProfileEditScreen`을 Subscription 탭 진입으로 노출했다. 공통 `RadioGroup` 컴포넌트와 `getProfile` API가 추가됐다. 백엔드는 `Profile.activityLevel`/`Profile.goal` 컬럼 추가, `PUT /me/profile` enum 검증 강화(`null` = 명시적 clear), 권장 계산을 미플린-세인트 지오어 + 활동 계수 + 목표 가감으로 교체했다. dev smoke(`profile-v13.mjs`) 9 케이스 모두 통과했고, NULL 시 안전 기본값(`moderate`/`maintain`) recalc 결과가 explicit과 동치임을 확인했다.
>
> 2026-05-09 (3회차) 갱신: 모바일 **APP_ONBOARD** 트랙이 구현·검증을 마쳤다. `apps/mobile`에 `OnboardingScreen` + Field/Segmented + 라이트/다크 토큰 + SecureStore 트리거 + 자동 권장 재계산이 들어갔고, 백엔드 `PUT /me/profile`에는 v1.2 검증(나이 13~99 / 신장 100~250 / 체중 20~300 / gender enum)이 적용됐다.
>
> 2026-05-09 (2회차) 갱신: 프론트 UI 트랙이 종료되어 admin-web 3화면(FOODS/INQUIRIES/NOTICES) + 대시보드 기간 컨트롤이 모두 v1.1 계약과 정합한다. dev 환경 smoke test(22 케이스, 3010 포트)로 신규 엔드포인트 응답·검증 코드(401/422)까지 확인했다.
>
> 2026-05-09 (1회차) 갱신: Phase C(슬롯/카피)와 별도 트랙으로 **백엔드 API 계약 보강**(`feature-diet-management-api-contract-v1.md` v1.1)이 완료되어, 카테고리/기간 필터·답변 등록·활성 재전환·대시보드 KPI 정의 갭이 백엔드 측에서는 닫혔다.

## 목적
SDK 기반(`scripts/stitch/`) 단독 생성된 4화면(2026-05-08 폴리시드)을 기준선으로, 현재 `apps/admin-web`이 어디까지 일치하고 어떤 슬롯/카피를 추가해야 하는지를 한 페이지에 정리한다.

근거:
- Stitch 산출물: `scripts/stitch/out/03-apply-design-system.json` (소스 SSOT)
- 다운로드 HTML: `scripts/stitch/out/html/{ADM_FOODS,ADM_INQUIRIES,ADM_NOTICES,APP_ONBOARD}.html`
- PRD: `docs/requirements/feature-diet-management-app-prd.md`
- 상태 매핑: `docs/requirements/feature-diet-management-state-mapping.md`

## 화면별 갭 표

### ADM_FOODS · 음식 템플릿 관리 (`454cc85ce4394104bd4859fd99eabb05`)

| 항목 | Stitch | 현재 admin-web | 갭/조치 |
|---|---|---|---|
| 좌측 사이드바 240px·상단 헤더 56px | ✓ | ✓ `Layout.tsx` | 일치 |
| 페이지 헤더 우측 "음식 추가" primary CTA | ✓ | ✓ `FoodsPage.tsx` `headerAction.onClick → openCreate` | 일치 |
| 필터 바: 검색·상태·카테고리·비활성 포함·검색/초기화 | ✓ | ✓ `FoodsPage.tsx` 카테고리 셀렉트(`extraQuery.category`) + `EntityListPage` 공통 필터 + `onResetExtraFilters` | 일치(스모크: `GET /admin/foods?category=…` 200) |
| 결과 테이블 15행·페이지네이션 중앙·메타 | ✓ | ✓ | 일치 |
| 행 액션(수정·비활성·활성 재전환) | ✓ | ✓ `FoodsPage.rowActions` (PUT, PATCH activate/deactivate) | 일치(스모크: 모두 200) |
| 신규 등록 우측 사이드 드로어 | ✓ | ✓ `Drawer` 컴포넌트 + 이름·카테고리·메모 폼 | 일치 |
| 빈 데이터 카피 "필터 조건에 맞는 음식이 없습니다." + "필터 초기화" CTA | ✓ | "검색 결과가 없습니다" + "필터 초기화" | 카피 정합 OK(자체 제너릭 카피 유지) |

### ADM_INQUIRIES · 문의 관리 (`3b2bf02c38394d769a24759f52ccb25b`)

| 항목 | Stitch | 현재 admin-web | 갭/조치 |
|---|---|---|---|
| 필터: 검색·상태(접수/처리중/완료)·기간·검색/초기화 | ✓ | ✓ `EntityListPage` status 옵션(`pending` 라벨 "접수", `in_progress` "처리중") + `InquiriesPage` 기간 셀렉트(`from`/`to`) | 일치(스모크: 기간 필터 200, 잘못된 enum 422) |
| 행 클릭 → 우측 답변 드로어 | ✓ | ✓ `InquiriesPage.openDetail` → `Drawer`(상세 + answer textarea + status select + transitionToDone 체크박스) | 일치(스모크: 답변 PATCH 200, 상태 PATCH 200) |
| 처리 상태 뱃지(warn/info/success/neutral) | ✓ | ✓ `entityColumns.tsx` STATUS_LABEL에 in_progress(`info`) 추가 | 일치 |
| 빈/로딩/오류/권한/완료 5상태 | ✓ | ✓ EntityListPage 공통 + Drawer 메시지 배너 | 일치 |

### ADM_NOTICES · 공지 관리 (`3dc3d8becec44bf6a275c6276f6e2fa0`)

| 항목 | Stitch | 현재 admin-web | 갭/조치 |
|---|---|---|---|
| 헤더 우측 "공지 작성" primary CTA | ✓ | ✓ `NoticesPage.headerAction.onClick → openCreate` | 일치 |
| 필터: 제목 검색·활성 상태·기간·검색/초기화 | ✓ | ✓ `NoticesPage` 기간 셀렉트(`from`/`to`) + 공통 필터 | 일치(스모크: 기간 필터 200) |
| 활성 토글 / 상세 / 비활성 행 액션 | ✓ | ✓ `NoticesPage.rowActions` (PATCH activate/deactivate) + `openEdit`이 `GET /:id` 호출로 폼 prefill | 일치(스모크: 모두 200) |
| 작성 모달(plain textarea — MD는 차후 도입 결정) | ✓ | ✓ `Modal` 컴포넌트 + 제목/본문 폼(monospace, `whiteSpace: pre-wrap`) | 일치(plain textarea로 시작) |
| 빈 데이터: "등록된 공지가 없습니다." + "공지 작성" CTA | ✓ | 자체 제너릭 카피 + `emptyAction` "공지 작성" 매핑 | 정합 OK |

### APP_ONBOARD · 모바일 온보딩 (`fd8994c143c84e6b89d98bbad6ffad35`)

`apps/admin-web` 범위 외(모바일 앱). 세부 갭/구현 매핑은 `docs/requirements/feature-mobile-onboarding-prd.md` + `docs/design/mobile-onboarding-spec.md` SSOT.

| 항목 | Stitch | 현재 apps/mobile | 갭/조치 |
|---|---|---|---|
| 단일 스텝 프로필 입력(성별·나이·신장·체중) | ✓ | ✓ `screens/OnboardingScreen.tsx` + `components/Segmented.tsx` + `components/Field.tsx` | 일치(활동량·목표 라디오는 v1.2 비범위·후속) |
| 5상태(기본/로딩/검증오류/통신오류/완료) | ✓ | ✓ ScreenScreen state + 인라인/배너/토스트 | 일치 |
| 라이트/다크 토큰 | ✓ | ✓ `theme.tsx` 라이트/다크 두 팔레트 + `useColorScheme()` 추종 | 일치(사용자 토글은 후속) |
| 트리거(부팅/재로그인 자동 진입) | — | ✓ `authStorage` `dm_onboarding_done` SecureStore 플래그 + `App.tsx`/`LoginScreen` 분기 | 일치 |
| 자동 권장 재계산 | — | ✓ 저장 후 `POST /me/recommendation/recalculate` 자동 호출(실패 시 토스트 경고 후 Main 진입) | 일치 |
| 백엔드 검증(13~99 / 100~250 / 20~300, gender enum) | API v1.2 | ✓ `apps/server/src/routes/me.ts` `PUT /me/profile` `code: VALIDATION_FAILED` + `details.field` | 일치(dev smoke 9 케이스 통과) |

### 대시보드 (`9c137926…`, 1차 세트)

| 항목 | Stitch | 현재 admin-web | 갭/조치 |
|---|---|---|---|
| KPI 카드 행 + 통계 집계 위젯 + 재집계 버튼 | ✓ | ✓ `DashboardPage.tsx` | 일치 |
| stale 카피 "최신값 반영" 버튼 | ✓ | ✓ | 일치 |
| stale 보조 메모 | "통계 반영 지연 안내" | ✓ PRD 운영 카피로 교체 완료(라이트/다크) | 일치 |
| KPI 정의(기간·타임존) | PRD/계약 v1.1 | ✓ `periodDays` 셀렉트(7/30/90) + 부제 `period.from ~ period.to` 표기 | 일치(스모크: `?periodDays=7|30` 200) |

## 진행 단계 요약

### Phase B — 백엔드 API 계약 보강 (2026-05-09 완료)
`apps/server/src/routes/admin.ts`와 Prisma 스키마 변경으로 다음 갭이 닫혔다. 자세한 응답·요청 필드는 [API 계약 v1.1](../requirements/feature-diet-management-api-contract-v1.md).

- 카테고리 필터: `GET /admin/foods?category=`, `POST/PUT` 본문 `category`, `FoodTemplate.category` 필드.
- 기간 필터: `GET /admin/inquiries?from&to`, `GET /admin/notices?from&to` (ISO 8601, `from <= to`).
- 활성 재전환: `PATCH /admin/foods/{id}/activate`, `PATCH /admin/notices/{id}/activate`.
- 답변 등록: `PATCH /admin/inquiries/{id}/answer` (자동 전이 옵션 `transitionToDone?`), `Inquiry.answer/answeredAt/answeredBy` 필드.
- 상세 조회: `GET /admin/{foods|inquiries|notices}/{id}`.
- 상태 enum 검증: 문의 `status`는 `pending` / `in_progress` / `done` 중 하나로 강제.
- 대시보드: `periodDays` 쿼리, `period`/`timezone`/`aggregatedAt`/`isStale`/`staleHours` 응답.
- 재집계: 응답에 `aggregatedAt` 포함.

### Phase C — 프론트 UI 트랙 (2026-05-09 완료)
`apps/admin-web/src/`에서 다음 작업으로 v1.1 계약을 모두 노출했다.

- 공통 컴포넌트: `components/Drawer.tsx`, `components/Modal.tsx` 신설(ESC·backdrop·focus 트랩·라이트/다크/반응형 포함). `index.css`에 `.drawer-*`, `.modal-*`, `.form-*`, `.detail-block`, `.clickable-row` 스타일 추가.
- `pages/EntityListPage.tsx` 옵셔널 props 확장: `extraFilters`, `extraQuery`, `onResetExtraFilters`, `rowActions`, `onRowClick`, `reloadKey`. inquiries 상태 옵션에 `in_progress` 추가, `pending` 라벨 "접수"로 갱신.
- `pages/entityColumns.tsx`: STATUS_LABEL에 `in_progress`/info, foods 컬럼에 `category` 추가.
- `pages/FoodsPage.tsx` (신규): 카테고리 셀렉트 + 행 액션(수정·비활성·재전환) + 추가/수정 Drawer.
- `pages/InquiriesPage.tsx` (신규): 기간 셀렉트 + 행 클릭 답변 Drawer(상세·answer·status·transitionToDone·비활성).
- `pages/NoticesPage.tsx` (신규): 기간 셀렉트 + 행 액션 + 작성/수정 Modal(plain textarea, monospace).
- `pages/DashboardPage.tsx`: `periodDays` 셀렉트(7/30/90) + 부제에 `period.from ~ period.to` 표기.
- `App.tsx`: `/foods`, `/inquiries`, `/notices` 라우트를 wrapper 페이지로 교체.

### 검증 결과 (2026-05-09)
- 정적: `tsc --noEmit -p apps/admin-web` ✓, ESLint ✓, `vite build` ✓.
- dev 환경 smoke (server 3010 포트, `scripts/stitch/out/admin-smoke.ps1`, 22 케이스 모두 의도대로 응답):
  - 인증: 로그인 200, 잘못된 토큰 401.
  - 대시보드: `periodDays=7|30` 200(`period`/`timezone`/KPI 필드 포함), `POST /admin/stats/reaggregate` 202.
  - foods: 생성·상세·부분수정·비활성·재활성 모두 200, `category` 60자 → 422.
  - inquiries: 기간 필터 200, 상세 200, `PATCH /answer`(transitionToDone) 200, 상태 변경 200, 잘못된 enum → 422.
  - notices: 기간 필터 200, 생성 201·상세 200·수정·비활성·재활성 200.
  - 검증: `from > to` → 422.
- 한계: PowerShell `Invoke-RestMethod`의 기본 charset 동작으로 한국어 본문은 콘솔 출력이 깨지고 한글 카테고리 일치 필터의 정확성은 smoke로 미검증(실 UI는 fetch+UTF-8). UI에서 한 번 시각 확인을 권장한다.

### Phase J — Settings 탭 신설 + LoginScreen 다크모드 정합 (2026-05-09 완료)

#### J-1. Settings 탭 신설 (모바일)
- 모바일 신규: `src/screens/SettingsScreen.tsx` (헤더 + 카드 3 — 내 프로필 / 테마 / 알림 준비 중 점선 슬롯).
- 모바일 변경: `src/navigation.tsx` MainTabs에 5번째 `Tabs.Screen name="Settings" title="설정"` 추가, `src/screens/SubscriptionScreen.tsx`에서 "내 프로필" 카드 + "테마" 카드 + 관련 import(`Segmented`/`useUserThemeMode`/`useNavigation` 등) 제거 → 구독·복구 영역만 유지.
- 디자인 스펙: `docs/design/mobile-settings-tab-spec.md` v0.1 (67 §0 면제 명시 + 시각 점검 10항목).
- 토큰: `theme.tsx`에 `borderStrong` 토큰이 없으므로 점선 보더는 `border` 토큰으로 정합. 디자인 스펙 §2.5·§2.6 동기화.
- 백엔드/계약 영향 0. 마이그레이션 0.

#### J-2. LoginScreen 다크모드 정합 (모바일)
- 모바일 변경: `src/screens/LoginScreen.tsx` 하드코딩 색상 → `useTheme()` 토큰 교체.
  - 화면 배경 → `bg`, 제목 → `fg`, 힌트 → `fgMuted`, 오류 → `danger`, 인풋(border/배경/텍스트/플레이스홀더) → `border`/`surface`/`fg`/`fgSubtle`, 구분 텍스트 → `fgMuted`, 충돌 박스(border/배경/제목/설명) → `border`/`surface`/`fg`/`fgMuted`.
  - 기본 `Button` color prop은 `primary` (취소는 `fgMuted`).
- SNS 브랜드 색(naver `#03c75a` / google `#4285f4` / kakao `#fee500` / kakaoText `#1f1f1f`)은 의도적으로 라이트/다크 모두 동일 유지.
- 67-dual-design-exemption §0 면제 적용: "기존 화면의 토큰 정합 보강" 좁은 스코프, 기존 `theme.tsx` SSOT.

### 검증 결과 (Phase J, 2026-05-09)
- 정적: `tsc --noEmit -p apps/mobile` ✓ (Settings 5.3s + LoginScreen 5.0s), lint clean.
- 자동 smoke 없음(시뮬레이터/실기기 시각 점검에 위임). 절차는 `docs/design/mobile-settings-tab-spec.md` §11 (10항목) + LoginScreen은 누적 시각 점검 절차에 흡수.

### Phase I — Login 토스트 적용 + Settings 탭 신설 PRD (2026-05-09 완료)
양 플랫폼 LoginPage/LoginScreen 토스트 적용 + Settings 탭 신설 PRD 작성 두 묶음을 자동 진행으로 마감했다.

#### I-1. Login 토스트 적용
- admin-web `LoginPage.tsx`: 이메일/비밀번호 로그인 성공 → success "로그인했어요." + dashboard navigate, 실패 → 인라인 banner 보존 + error 토스트.
- 모바일 `LoginScreen.tsx`: 이메일 로그인(성공/실패) + SNS 로그인 4분기(취소=info, 성공=success, conflict=info "충돌 처리 안내", 실패=error) + 계정 충돌 해결(connect/separate 성공=success 차별 카피, 실패=error)에 모두 토스트 발화. 기존 `setErr` 인라인 메시지 보존(보조 알림).
- ToastProvider가 NavigationContainer/Routes 바깥에 마운트돼 있어 로그인 성공 후 화면 전환 직후에도 토스트가 그대로 보임.
- 67-dual-design-exemption §0 면제 적용 그대로(단일 오버레이 보강).

#### I-2. Settings 탭 신설 PRD v0.1 (사용자 승인 대기)
- 신규: `docs/requirements/feature-mobile-settings-tab-prd.md` v0.1.
- 결정: S1~S8 "쭉 진행" 추천안 자동 적용. (S1=마지막 위치, S2="설정", S3=텍스트만(아이콘 후속), S4=ProfileEdit 라우트 재사용, S5=ThemeToggle 그대로 이전, S6=로그아웃 위치 변경 없음, S7=알림 슬롯은 "준비 중" 점선 카드, S8=PRD까지만 본 트랙, 디자인+구현은 별도 Phase J).
- 67-dual-design-exemption §0 면제 사전 정합 명시(좁은 스코프 + SSOT 존재 + 면제 사유). Phase J 디자인 스펙에서 §0에 그대로 인용.
- HUMAN 게이트: 사용자 명시 승인 후 Phase J(디자인 스펙 + 구현)로 진입.

### 검증 결과 (Phase I, 2026-05-09)
- 정적: `tsc --noEmit -p apps/admin-web` ✓ (5.6s), `tsc --noEmit -p apps/mobile` ✓ (5.3s), lint clean.
- 빌드: `vite build` ✓ (0.3s, 268.78KB JS · 18.30KB CSS · 0.41KB index.html). 토스트 추가에 따른 청크 증가 ~0.1KB.
- 자동 smoke 없음(인증 흐름은 SecureStore/AuthSession/네이버·구글·카카오 OAuth 의존이라 로컬 시뮬레이터/브라우저 시각 점검에 위임).

### Phase H — admin-web 토스트 시스템 v0.1 (2026-05-09 완료)
admin-web에 양 플랫폼 공통 정책 기반 결과 메시지 표시 수단을 도입했다. SSOT는 `docs/requirements/feature-admin-toast-prd.md` v0.1 + `docs/design/admin-toast-spec.md` v0.1.

- admin-web 신규: `src/toast/ToastProvider.tsx`(Context + 시각 컴포넌트 인라인 + 스택 최대 3개 큐잉), `src/toast/useToast.ts`. `index.css`에 `.toast-stack`/`.toast-card`/`.toast-success`/`.toast-error`/`.toast-info`/`.toast-icon`/`.toast-message`/`.toast-close` + `@keyframes toast-in/out` 추가.
- admin-web 변경: `App.tsx`(ThemeProvider→AuthProvider→ToastProvider→Routes 트리), `pages/FoodsPage.tsx`(save success/error + setActive success/error → alert 제거), `pages/InquiriesPage.tsx`(openDetail error → alert 제거 + submitAnswer/updateStatus/deactivate에 success/error 토스트 추가), `pages/NoticesPage.tsx`(openEdit error → alert 제거 + save success/error + setActive success/error), `pages/DashboardPage.tsx`(reaggregate success/error 토스트).
- 의존성 추가 0(자체 구현). 백엔드/계약 영향 없음.
- 모바일과 차이: 위치(top-right vs 하단 safe-area), 큐잉(스택 최대 3 vs 단일 교체). 그 외(시간·종류·액션 버튼 X·자체 구현)는 동일 정책.
- 67-dual-design-exemption 면제 적용: 단일 오버레이 보강 + 기존 `--ds-*` 토큰 + `.banner-*` 패턴 재사용. 면제 사유는 `admin-toast-spec.md` §0에 명시.

### 검증 결과 (Phase H, 2026-05-09)
- 정적: `tsc --noEmit -p apps/admin-web` ✓ (5.1s), lint clean.
- 빌드: `vite build` ✓ (1.1s, 268KB JS · 18KB CSS · 0.41KB index.html).
- 자동 smoke 없음(브라우저 시각·인터랙션 점검에 위임).
- 한계: 브라우저 라이트/다크·반응형(1024/768/480)·VoiceOver/TalkBack 시각 점검은 사용자 환경 의존. 절차는 `docs/design/admin-toast-spec.md` §11 체크리스트 11 항목.

### Phase G — 모바일 토스트 시스템 v0.1 (2026-05-09 완료)
`apps/mobile`에 단일 ToastProvider 기반 결과 메시지 표시 수단을 도입했다. SSOT는 `docs/requirements/feature-mobile-toast-prd.md` v0.1 + `docs/design/mobile-toast-spec.md` v0.1.

- 모바일 신규: `src/toast/ToastProvider.tsx`(Context + Animated.View 시각 컴포넌트 인라인 + 단일 교체 큐잉), `src/toast/useToast.ts`.
- 모바일 변경: `App.tsx`(ThemeProvider 안쪽 / NavigationContainer 바깥쪽에 ToastProvider 마운트), `src/screens/OnboardingScreen.tsx`(저장 성공·저장 실패·recalc 실패 3사용처에서 토스트 발화 + 기존 banner 보존 + 인라인 success 박스 제거), `src/screens/ProfileEditScreen.tsx`(저장 성공·저장 실패 2사용처에서 토스트 발화, 성공 시 100ms 후 navigation.goBack()).
- 의존성 추가 0(자체 구현). 백엔드/계약 영향 없음.
- 67-dual-design-exemption 면제 적용: 단일 오버레이 보강 + 기존 토큰(`success`/`danger`/`info`/`surface`) + 기존 컴포넌트(SafeAreaProvider, Animated.View) 재사용. 면제 사유는 `mobile-toast-spec.md` §0에 명시.

### 검증 결과 (Phase G, 2026-05-09)
- 정적: `tsc --noEmit -p apps/mobile` ✓ (5.9s), lint clean.
- 자동 smoke 없음(클라이언트 한정 동작이라 시뮬레이터 시각 점검에 위임).
- 한계: 시뮬레이터/실기기 시각 점검(5사용처 발화·단일 교체 큐잉·라이트/다크 4.5:1 대비·VoiceOver/TalkBack 어나운싱 등)은 사용자 환경 의존. 절차는 `docs/design/mobile-toast-spec.md` §11 체크리스트 10 항목.

### Phase F — 모바일 테마 사용자 토글 v0.1 (2026-05-09 완료)
`apps/mobile`에서 사용자가 라이트/다크를 직접 선택·저장할 수 있도록 도입했다. SSOT는 `docs/requirements/feature-mobile-theme-toggle-prd.md` v0.1 + `docs/design/mobile-theme-toggle-spec.md` v0.1.

- 모바일 신규: `src/userPrefs.ts`(SecureStore 키 `dm_theme_mode`).
- 모바일 변경: `src/theme.tsx`(부팅 1프레임 보호 분기 + 첫 부팅 시드 후 영속 저장 + 우선순위 `DevPanel themeOverride !== 'system'` > 사용자 모드 > 시드, 신규 `useUserThemeMode` 훅), `src/screens/SubscriptionScreen.tsx`("내 프로필" 카드와 "구독 · 복구" 사이에 "테마" 카드 + Segmented 2종 — 기존 `Segmented` 컴포넌트 재사용).
- DevPanel 변경 없음(우선순위 체계가 새 `theme.tsx`에 흡수됨, dev `themeOverride='system'`이 사용자 모드를 덮어쓰지 않음).
- 백엔드/계약 영향 없음(클라이언트 한정 기능).
- `clearTokens()`는 테마 키를 삭제하지 않음(디바이스 선호 유지가 자연스러움).

### 검증 결과 (Phase F, 2026-05-09)
- 정적: `tsc --noEmit -p apps/mobile` ✓, lint clean.
- 자동 smoke 없음(클라이언트 한정 동작이라 시뮬레이터 시각 점검에 위임).
- 한계: 시뮬레이터/실기기 시각 점검(첫 부팅 시드, 강제 종료 후 유지, OS 변경 무반응, DevPanel 우선순위, 두 팔레트 4.5:1 대비 등)은 사용자 환경 의존. 절차는 `docs/design/mobile-theme-toggle-spec.md` §12 체크리스트 10 항목.

### Phase E — 모바일 프로필 확장(활동량·목표) v1.3 (2026-05-09 완료)
`apps/mobile`과 `apps/server`에서 활동량·목표 입력과 권장 계산식 v1.3을 도입했다. SSOT는 `docs/requirements/feature-mobile-profile-extra-prd.md` v0.1(.1) + `docs/design/mobile-profile-extra-spec.md` v0.1(.1) + [API 계약 v1.3](../requirements/feature-diet-management-api-contract-v1.md).

- 모바일 신규: `components/RadioGroup.tsx`, `screens/ProfileEditScreen.tsx`. `api/profile.ts`에 `getProfile`/`SaveProfileInput` 추가, `ProfileInput`에 `activityLevel?`/`goal?`(nullable) 옵셔널.
- 모바일 변경: `screens/OnboardingScreen.tsx`(활동량·목표 라디오 슬롯), `screens/SubscriptionScreen.tsx`(상단 "내 프로필" 카드 + "프로필 편집" 진입), `navigation.tsx`(`ProfileEdit` 라우트, headerShown:true).
- 백엔드 v1.3: `Profile.activityLevel`/`Profile.goal` 컬럼(NULL 허용), `PUT /me/profile` enum 검증 + `null` clear 의미론, 권장 계산 로직을 `lib/recommendation.ts`로 분리(미플린-세인트 지오어 + 활동 계수 + 목표 가감).
- 컨트랙트 v1.3 changelog 추가 + Profile 절 보강(응답 nullable 필드, PUT 본문 의미론 표).

### 검증 결과 (Phase E, 2026-05-09)
- 정적: `tsc --noEmit -p apps/mobile` ✓, `tsc --noEmit -p apps/server` ✓, lint clean.
- dev 환경 smoke (`scripts/stitch/out/profile-v13.mjs`, server 3010, USER): 9 케이스 모두 의도대로.
  - 정상 PUT 200, GET 200(응답에 `activityLevel`/`goal` 포함), recalc 200(BMR·TDEE·목표 가감 검산 일치).
  - 422 + `details.field`: `activityLevel=invalid`, `goal=invalid`, `gender=other`, `age=12` 모두 정확 매핑.
  - `null clears`: `activityLevel: null`/`goal: null` 200, GET에 NULL 반영.
  - 안전 기본값 정합: NULL 상태 recalc(104g, 2711kcal at 65kg male moderate gain 직전 상태) ↔ explicit `moderate`/`maintain` recalc(65g, 2465kcal) 동치 확인.
- 한계: 모바일 시뮬레이터/실기기 시각 점검(라디오 카드 라이트/다크 톤·재탭 미선택 동작·ProfileEdit dirty 가드 등)은 사용자 환경 의존이라 본 트랙에서는 제외. 절차는 `docs/design/mobile-profile-extra-spec.md` §10 체크리스트 9 항목.

### Phase D — 모바일 APP_ONBOARD (2026-05-09 완료)
`apps/mobile`에서 단일 스텝 온보딩과 라이트/다크 토큰을 도입했다. 자세한 내용은 `docs/requirements/feature-mobile-onboarding-prd.md` v0.1 + `docs/design/mobile-onboarding-spec.md` v0.1 + [API 계약 v1.2](../requirements/feature-diet-management-api-contract-v1.md).

- 모바일 신규: `screens/OnboardingScreen.tsx`, `components/Field.tsx`, `components/Segmented.tsx`, `api/profile.ts`(`ProfileApiError`/`isAuthDenied`), `theme.tsx`(라이트/다크 토큰 + `ThemeProvider`).
- 모바일 변경: `App.tsx`(SafeAreaProvider/ThemeProvider 추가, `getOnboardingDone()` 평가로 `initialRoute` 분기), `navigation.tsx`(`Onboarding` 라우트 추가, `initialLoggedIn` → `initialRoute`로 시그니처 변경), `screens/LoginScreen.tsx`(`navigation.replace('Main')` → `goAfterLogin()` 트리거 평가), `authStorage.ts`(`getOnboardingDone`/`setOnboardingDone` 추가, `clearTokens`에서 함께 제거).
- 백엔드 v1.2: `apps/server/src/routes/me.ts` `PUT /me/profile` 모든 필드 검증 + `details.field`/`allowedMin`/`allowedMax`/`allowed` 표준화. 컨트랙트 §3 Profile 절 보강 + §8 v1.2 changelog 추가.

### 검증 결과 (Phase D, 2026-05-09)
- 정적: `tsc --noEmit -p apps/mobile` ✓, `tsc --noEmit -p apps/server` ✓, lint clean.
- dev 환경 smoke (`scripts/stitch/out/profile-bodies.mjs`, server 3010, USER `user@example.com`): 9 케이스 모두 의도대로 응답.
  - `age=12 / age=100 / age=12.5` → 422 + `details.field=age, allowedMin=13, allowedMax=99`.
  - `gender=other` → 422 + `details.field=gender, allowed=[male,female,unspecified]`.
  - `heightCm=99 / heightCm=251` → 422 + `details.field=heightCm, allowedMin=100, allowedMax=250`.
  - `weightKg=19 / weightKg=301` → 422 + `details.field=weightKg, allowedMin=20, allowedMax=300`.
  - `proteinGoalG=20000` → 422 + `details.field=proteinGoalG, allowedMin=0, allowedMax=10000`.
- 정상 저장(경계값 13/100/20/male) → 200, 이어진 `POST /me/recommendation/recalculate` → 200(`proteinGoalG`/`calorieGoalKcal` 산출). 토큰 미동봉 호출 → 401.
- 한계: 모바일 시뮬레이터/실기기 시각 점검(라이트/다크 톤·키보드 회피·토스트 모션·SecureStore 플래그 재함입)은 사용자 환경 의존이라 본 트랙에서는 제외. 절차는 `docs/design/mobile-onboarding-spec.md` §9 체크리스트.

## 잔여(후속 트랙)

- 모바일 시뮬레이터/실기기 시각 점검(누적): `docs/design/mobile-onboarding-spec.md` §9 + `docs/design/mobile-profile-extra-spec.md` §10 + `docs/design/mobile-theme-toggle-spec.md` §12 + `docs/design/mobile-toast-spec.md` §11 + `docs/design/mobile-settings-tab-spec.md` §11 체크리스트(총 47 항목).
- admin-web 브라우저 시각 점검: `docs/design/admin-toast-spec.md` §11 (11 항목) + 라이트/다크·반응형·한글 카테고리 필터(누적 별도 절차) — 사용자 환경 의존.
- 권장 계산 의학 자문/문헌 인용 보강(v1.4) — 단순 단백질 식(g/kg)을 활동량까지 반영하도록 정밀화.
- 권장량 사용자 직접 오버라이드 UI 노출(현재 컬럼만 존재, ProfileEdit는 읽기 전용 카드).
- ProfileEdit 진입을 위한 별도 Settings 탭 신설(현재는 Subscription 탭 진입).
- 알림 설정 본 기능(푸시 권한 + 식사 시간 알림 + 권장량 미달 알림) — Settings 탭 알림 슬롯 활성화, 별도 Phase.
- Settings 탭에 향후 도입 후보: 언어 설정(다국어 지원 도입 후), 접근성(폰트 스케일·고대비), 로그아웃 위치 일관성 정돈, 탭 아이콘 도입.
- 공지 본문 MD 에디터/미리보기(현재 plain textarea로 시작) — 도입 시 별도 PRD 절.
- `/members` 행 액션·기간 필터 보강(현재 비포함).

### emergent-rule 후보(승인 전, 임시 가이드)

직전 세 트랙(APP_ONBOARD v1.2 + 프로필 확장 v1.3 + 테마 토글 v0.1)에서 동일한 패턴이 반복 적용되어 후보로 기록한다. (A)는 2026-05-09 정식 룰로 승격되어 별도 룰 파일로 분리됐고, (B)·(C)는 2026-05-09 (11회차) Phase K 점검 시점에도 적용 누적 1회 유지 → 임시 가이드 유지(추가 적용 사례 누적 후 승격 검토).

- ✅ **정식 룰 승격됨** (2026-05-09, `.cursor/rules/67-dual-design-exemption.mdc`로 분리 신설): "Stitch brief가 충분히 상세하고 단일 스텝/소형 모바일 화면 또는 기존 컴포넌트 재사용 단일 카드 보강이라면 65-design-gate의 안 A 로컬 와이어 면제 가능. 면제 사유(스코프·출처·재사용 컴포넌트)를 해당 디자인 스펙 §0에 명시할 것." (적용 누적 3회: APP_ONBOARD v1.2 / 프로필 확장 v1.3 / 테마 토글 v0.1)
- (1건 적용, 임시 가이드 유지) **(B)** "PUT 부분 갱신 본문에서 키 미전송 = 변경 없음, `null` = 명시적 clear의 의미론을 nullable 필드에 적용. 클라이언트 saveProfile은 `initial`/`form` diff만 보낸다." 
  - 적용 1건: 프로필 확장 v1.3 (activityLevel/goal nullable clear).
  - **승격 트리거(점검 발동 조건)**: 새로운 PUT 부분 갱신 엔드포인트에서 nullable 필드를 clear할 수 있어야 하는 경우. 예) 알림 설정 본 기능에서 알림 시간 비우기, 추가 ProfileExtra 필드(언어/접근성), 어드민의 사용자 권장량 오버라이드 clear. **누적 ≥3 충족 시 67 패턴(별도 룰 파일 또는 60-delivery-gates 절 추가)으로 승격 검토.**
  - **Phase K 점검 결과(2026-05-09)**: 트랙 2(모바일 토스트), 3(admin 토스트), 4(Login 토스트), 5(Settings PRD), 6(Settings 구현), 7(LoginScreen 다크), 8(borderStrong 토큰)에서 추가 누적 0건. 1회 유지.
  - **Phase L 점검 결과(2026-05-09)**: 트랙 10(시각 점검 누적 통합 — 문서만), 11(MainTabs 탭 아이콘 — 클라이언트 단일 파일 변경, API 변경 0)에서도 추가 누적 0건. 1회 유지.
  - **Phase M 점검 결과(2026-05-10)**: 트랙 12(Settings 계정 카드 — 클라이언트 변경, `clearTokens()` 흐름 재사용), 13(Ionicons 업그레이드 — 의존성 1개 + navigation.tsx 변경, API 변경 0)에서도 추가 누적 0건. 1회 유지. Phase O(알림) 진입 시 트리거 발동 예상.
  - **Phase N 점검 결과(2026-05-10)**: A2(모체 PRD §15 신설 — 문서만), A3(dev smoke 스크립트 + 회귀 점검 — 점검만, 데이터 변경 없음)에서도 추가 누적 0건. 1회 유지.
  - **Phase O 점검 결과(2026-05-10)**: 결정 N6=a SecureStore-only로 신규 PUT/PATCH API 0. 알림 prefs 저장은 SecureStore 6개 키 + `disableAll()` 일괄(boolean false 명시), null clear 의미론 미사용. 추가 누적 0건. 1회 유지(다음 트리거 후보: 알림 prefs 서버 동기화 도입 시 — Phase P+).
- (1건 적용, 임시 가이드 유지) **(C)** "ThemeProvider 등 부팅 비동기 컨텍스트는 결정 전(`null`) children 미렌더로 1프레임 깜빡임을 막고, `App.tsx`의 `initialRoute === null` 같은 다른 부팅 분기와 같은 시점에 결정되도록 정렬한다."
  - 적용 1건: 테마 토글 v0.1 (`ThemeProvider` 부팅 시 SecureStore에서 `userMode` 읽기).
  - **승격 트리거(점검 발동 조건)**: 새로운 부팅 비동기 컨텍스트 도입 시. 예) 푸시 알림 권한 + 토큰 등록(알림 본 기능 진입 시), 다국어 설정 부팅 SecureStore 로드, 폰트 스케일·접근성 설정 부팅 로드, 어드민의 부팅 시 권한·역할 사전 페치. **누적 ≥3 충족 시 승격 검토.**
  - **Phase K 점검 결과(2026-05-09)**: 트랙 2~8에서 추가 누적 0건. ToastProvider는 동기 컨텍스트(SecureStore/Network 읽지 않음)이므로 (C) 패턴 적용 대상 아님. 1회 유지.
  - **Phase L 점검 결과(2026-05-09)**: 트랙 10(문서), 11(navigation.tsx)에서도 추가 누적 0건. MainTabs 변경은 부팅 컨텍스트가 아닌 화면 렌더 시점이라 (C) 패턴 미적용. 1회 유지.
  - **Phase M 점검 결과(2026-05-10)**: 트랙 12(Settings 계정 카드 — Alert.alert 동기 흐름), 13(Ionicons — RN 컴포넌트 동기 렌더)에서도 추가 누적 0건. 두 트랙 모두 부팅 비동기 컨텍스트 미도입. 1회 유지. Phase O(알림) 진입 시 트리거 발동 예상(`expo-notifications` 부팅 권한+토큰 등록).
  - **Phase N 점검 결과(2026-05-10)**: A2(문서), A3(smoke 스크립트)에서도 추가 누적 0건. 부팅 비동기 컨텍스트 변경 없음. 1회 유지.
  - **Phase O 점검 결과(2026-05-10)**: App.tsx 부팅 useEffect에 `await setupNotifications()`을 추가했지만 — (a) 부팅 단계 자체는 기존 `ready` flag로 hydrate되고, (b) 권한 hydration은 NotificationCard 내부 `permState='loading'` → 'undetermined/granted/denied'로 자체 처리해 부팅 차단·미렌더 패턴이 추가 도입되지 않았다. emergent-rule (C) "부팅 비동기 컨텍스트 미렌더" 정의는 "사용자 prefs(테마 모드 등)가 SecureStore에서 hydrate되기 전 화면 미렌더"였고, Phase O는 이를 따르지 않은(즉 카드 자체는 즉시 렌더 + 카드 내부 상태만 loading) 패턴 → 다른 변형. **추가 누적 0건. 1회 유지.** 단, 다음 트리거 후보: Phase P 또는 추후 알림 권한·토큰 hydrate를 부팅 단계에서 강제할 경우.

### 시각 점검 절차(권장)

> **단일 진입점**: `docs/design/visual-inspection-cumulative.md` v0.2 (74 항목, 실효 73). admin-web/모바일 통합 체크리스트.

본 절은 admin-web 5화면 dev smoke 절차로, 누적 체크리스트 §8에 동일 항목이 적재되어 있다.

1. server를 3000 포트가 비어 있을 때 띄운다(`npm run dev:server`). 또는 임시 포트로 띄우려면 `vite.config.ts`의 proxy target을 일치시켜 `npm run dev:admin`을 재시작.
2. admin-web(`http://localhost:5174/`)에서 `admin@example.com / admin123`으로 로그인.
3. 라이트/다크 토글 + 1280px / 768px 뷰포트에서 다음을 확인:
   - 대시보드: 기간 셀렉트 변경 시 부제(`period.from ~ to`)/KPI 갱신.
   - 음식: 카테고리 셀렉트(한식/간식 등) 적용 후 결과 1건 이상 노출, 행 액션·드로어 동작.
   - 문의: 기간 7/30/90 적용, 행 클릭 드로어, 답변 등록 후 "completed" 라벨/`answeredAt` 표시.
   - 공지: 기간 적용, 모달 작성·수정·비활성/재활성.
   - 5상태: 토큰 만료(403/401) → ForbiddenState, 빈 결과 → EmptyState, 네트워크 차단 → 오류 배너.
