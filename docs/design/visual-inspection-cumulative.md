---
type: design-spec
project: dietManagement
doc_lane: design
related:
  - docs/design/mobile-onboarding-spec.md
  - docs/design/mobile-profile-extra-spec.md
  - docs/design/mobile-theme-toggle-spec.md
  - docs/design/mobile-toast-spec.md
  - docs/design/mobile-settings-tab-spec.md
  - docs/design/mobile-notifications-spec.md
  - docs/design/admin-toast-spec.md
  - docs/design/admin-stitch-gap-2026-05-08.md
updated_at: 2026-05-16
tags: [qa, visual-inspection, checklist, mobile, admin-web, dark-mode]
---

# 시각 점검 누적 체크리스트 v0.8

## 0) 목적

여러 디자인 스펙(`*-spec.md`) §시각 점검 § 항목을 **사용자 환경에서 직접 점검 가능한 단일 통합 체크리스트**로 모은다. 각 트랙 마감 시 자동 검증(tsc/lint/build)은 통과시켰지만 **렌더 결과·대비·인터랙션·다크 모드** 같은 항목은 사용자 환경 의존이라 본 문서가 단일 진입점이 된다.

원본 §시각 점검 § 항목을 그대로 옮겨 적되, 각 항목 끝에 `[origin: <spec> §<n>]`를 붙여 추적 가능하게 한다. 새 트랙이 생기면 본 문서에 카테고리를 추가한다.

## 1) 점검 환경 가이드

### 1.1 모바일 (`apps/mobile`)

- 디바이스 또는 시뮬레이터: iPhone 14 / iPhone SE / Android Pixel 5 / 360px 시뮬레이터.
- Expo Go 또는 dev client에서 `npm run dev:mobile` 후 QR 스캔.
- DevPanel 진입: 화면 우측 하단 ⚙️ 버튼(개발 빌드에서만 노출).
- DevPanel 토글:
  - `themeOverride`: `system` / `light` / `dark` 강제.
  - `force5xx`: saveProfile 5xx 강제.
  - `forceRecalcFail`: recalcRecommendation 실패 강제.
- SecureStore 초기화: 앱 강제 종료 후 데이터 정리(또는 `dm_*` 키 수동 제거)로 첫 부팅 재현.

### 1.2 admin-web (`apps/admin-web`)

- 브라우저: 최신 Chrome 또는 Firefox.
- 서버: `npm run dev:server` (port 3000) + `npm run dev:admin` (port 5174).
- 로그인 시드: `admin@example.com / admin123`.
- 다크 토글: 사이드바 하단 토글 또는 OS 설정 변경.
- 뷰포트: 1280px 데스크톱 + 1024px 태블릿 가로 + 768px 태블릿 세로 + 480px 모바일 폭(반응형 확인용).

### 1.3 공통

- 라이트/다크 두 팔레트에서 모든 항목을 한 번씩 반복.
- 문제 발견 시 본 문서의 해당 항목에 `[BUG: <짧은 설명>]`를 추가하고 후속 트랙에서 수정.
- 통과한 항목은 `[ ]` → `[x]` 표기 + 점검자/날짜 메모(선택).

---

## 2) 모바일 — Onboarding 화면 (`mobile-onboarding-spec.md`)

총 8 항목. APP_ONBOARD v1.2 트랙 산출.

- [ ] iPhone(390x844) 시뮬레이터: ⚙️ 테마 강제(라이트/다크) 토글 시 색·대비 정합. [origin: mobile-onboarding-spec §시각 점검]
- [ ] Android Pixel 5: sticky 버튼이 키보드 위로 올라옴. [origin: mobile-onboarding-spec §시각 점검]
- [ ] 검증 오류 5케이스: age 12·100, height 99·251, weight 19.9·300.1, gender 미선택, 모두 미입력. (서버 메시지 + `details.field`로 인라인 표시) [origin: mobile-onboarding-spec §시각 점검]
- [ ] 서버 422 시뮬레이션: 위 케이스를 그대로 입력하면 backend가 422 응답 + `details.field`를 반환 → 인라인 + 상단 배너. [origin: mobile-onboarding-spec §시각 점검]
- [ ] ⚙️ 5xx 시뮬레이션: DevPanel "saveProfile 5xx 강제" 토글 후 "다음" 클릭 → 상단 빨간 배너 표시(서버 종료 없이 재현). [origin: mobile-onboarding-spec §시각 점검]
- [ ] ⚙️ 로그아웃 → 다른 계정 로그인 → Onboarding 재함입: DevPanel "강제 로그아웃" 후 다른 계정으로 로그인. [origin: mobile-onboarding-spec §시각 점검]
- [ ] ⚙️ "나중에 설정" → Main 이동 → DevPanel "온보딩 재진입"으로 즉시 Onboarding 라우트로 reset (앱 재시작 대용). [origin: mobile-onboarding-spec §시각 점검]
- [ ] ⚙️ 저장 완료 + recalc 실패: DevPanel "recalcRecommendation 실패 강제" 토글 후 "다음" → 토스트 경고("권장량 계산은 잠시 후…") 1회 + Main 진입. [origin: mobile-onboarding-spec §시각 점검]

## 3) 모바일 — Profile Extra (활동량·목표) (`mobile-profile-extra-spec.md`)

총 9 항목. 프로필 확장 v1.3 트랙 산출.

- [ ] Onboarding: 활동량/목표 미선택 → "다음" 정상 동작, 권장값이 안전 기본값으로 계산됨. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] Onboarding: 같은 라디오 재탭 → 미선택으로 복귀. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ProfileEdit 진입: prefill 정상, 권장량 카드 표시. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ProfileEdit: 입력 변경 → "저장" 활성, 변경 없는 상태에서는 "저장" 비활성. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ProfileEdit: dirty 상태에서 ← 또는 "취소" → 확인 다이얼로그 → 진행/취소 동작. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ProfileEdit: 저장 성공 → 토스트 + 이전 화면 복귀, Subscription 카드의 권장값 갱신. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ⚙️ DevPanel saveProfile 5xx 강제 → ProfileEdit 상단 배너. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] ⚙️ DevPanel recalc 실패 강제 → 저장은 성공, 토스트 경고. [origin: mobile-profile-extra-spec §시각 점검]
- [ ] 라이트/다크 두 팔레트에서 라디오 카드 대비 4.5:1 이상. [origin: mobile-profile-extra-spec §시각 점검]

## 4) 모바일 — Theme Toggle (`mobile-theme-toggle-spec.md` §12)

총 10 항목. 테마 토글 v0.1 트랙 산출.

- [ ] 첫 부팅(앱 데이터 클린): OS가 다크면 다크, 라이트면 라이트로 시작. [origin: mobile-theme-toggle-spec §12]
- [ ] 첫 부팅 직후 앱 강제 종료 → 재실행 시 SecureStore 저장값으로 일관 시작(시스템과 무관). [origin: mobile-theme-toggle-spec §12]
- [ ] Subscription 탭에 "테마 설정" 카드가 "내 프로필" 카드 아래, "구독 · 복구" 위에 노출. (※ Phase J에서 Settings 탭으로 이전됐으므로 이 항목은 Settings 탭 §6의 위치 항목으로 대체됨.) [origin: mobile-theme-toggle-spec §12, **deprecated by Phase J**]
- [ ] 라이트 → 다크 Segmented 탭 시 즉시 전체 화면 전환. [origin: mobile-theme-toggle-spec §12]
- [ ] 다크 → 라이트로 다시 토글 시 즉시 복귀. [origin: mobile-theme-toggle-spec §12]
- [ ] 강제 종료 후 재실행 시 마지막 선택 유지. [origin: mobile-theme-toggle-spec §12]
- [ ] OS 시스템 다크/라이트 토글 → 앱은 무반응. [origin: mobile-theme-toggle-spec §12]
- [ ] DevPanel `themeOverride='light'/'dark'` 강제 시 사용자 모드 무시하고 즉시 화면 색 강제 적용. SecureStore 값은 변경되지 않음. [origin: mobile-theme-toggle-spec §12]
- [ ] DevPanel `themeOverride='system'` 복귀 시 사용자 모드로 즉시 복귀. [origin: mobile-theme-toggle-spec §12]
- [ ] 라이트/다크 두 팔레트에서 카드 보더·텍스트·Segmented 선택 표시 모두 4.5:1 이상 대비. [origin: mobile-theme-toggle-spec §12]

## 5) 모바일 — Toast (`mobile-toast-spec.md` §11)

총 10 항목. 모바일 토스트 v0.1 트랙 산출.

- [ ] OnboardingScreen 저장 성공 → success 토스트 노출 후 Main 진입. [origin: mobile-toast-spec §11]
- [ ] OnboardingScreen DevPanel `force5xx`=on → error 토스트 + 상단 배너 둘 다 노출. [origin: mobile-toast-spec §11]
- [ ] OnboardingScreen DevPanel `forceRecalcFail`=on → info 토스트 후 Main 진입. [origin: mobile-toast-spec §11]
- [ ] ProfileEditScreen 저장 성공 → success 토스트 발화 → 약 100ms 후 goBack → Subscription 탭에서도 토스트 마저 보임. (※ Phase J 이후로는 Settings 탭 진입의 ProfileEdit에서 동작이 같음.) [origin: mobile-toast-spec §11]
- [ ] ProfileEditScreen DevPanel `force5xx`=on → error 토스트 + 인라인 배너 둘 다 노출, goBack 안 됨. [origin: mobile-toast-spec §11]
- [ ] 라이트/다크 두 팔레트에서 3 종류 토스트 모두 4.5:1 대비. [origin: mobile-toast-spec §11]
- [ ] DevPanel `themeOverride='light'/'dark'` 강제 시 토스트 색도 즉시 정합. [origin: mobile-toast-spec §11]
- [ ] 빠르게 연속 발화 시 새 토스트가 이전을 교체(둘 동시 노출 없음). [origin: mobile-toast-spec §11]
- [ ] 토스트 터치 → 즉시 dismiss. [origin: mobile-toast-spec §11]
- [ ] VoiceOver/TalkBack: success는 polite, error는 assertive 어나운싱. [origin: mobile-toast-spec §11]

## 6) 모바일 — Settings 탭 (`mobile-settings-tab-spec.md` §11)

총 13 항목. Settings 탭 v0.5(Phase O) 기준. (※ §2.5 알림 슬롯 → §10 본 기능 카드로 대체. 카드 3 점검 항목은 §10으로 이전.)

- [ ] 하단 탭에서 "설정" 탭이 5번째(마지막) 위치에 노출된다. [origin: mobile-settings-tab-spec §11]
- [ ] 설정 탭 진입 시 헤더 + 카드 4개(프로필·테마·알림·계정)가 순서대로 보인다. [origin: mobile-settings-tab-spec §11]
- [ ] "프로필 편집" 버튼 탭 → ProfileEdit 화면으로 이동. [origin: mobile-settings-tab-spec §11]
- [ ] 테마 Segmented "라이트"/"다크" 전환 즉시 반영 + 앱 재실행 후에도 유지(SecureStore). [origin: mobile-settings-tab-spec §11]
- [ ] ~~알림 카드는 점선 보더(`borderStrong`) + 흐릿한 톤 + 클릭 비활성.~~ (Phase O에서 본 기능 카드로 대체 — §10 참고. **deprecated by Phase O**) [origin: mobile-settings-tab-spec §11]
- [ ] 라이트 팔레트에서 4.5:1 대비. [origin: mobile-settings-tab-spec §11]
- [ ] 다크 팔레트에서 4.5:1 대비. [origin: mobile-settings-tab-spec §11]
- [ ] 구독 탭 진입 시 프로필·테마 카드가 더 이상 보이지 않고 구독·복원 영역만 보인다. [origin: mobile-settings-tab-spec §11]
- [ ] DevPanel `themeOverride` 강제 적용 시 설정 화면도 정합. [origin: mobile-settings-tab-spec §11]
- [ ] VoiceOver/TalkBack: 각 카드 헤더 + 본문 + 버튼 순으로 자연스럽게 어나운싱. [origin: mobile-settings-tab-spec §11]
- [ ] **계정 카드 (Phase M)**: 헤더 "계정" + 안내 + danger 톤 "로그아웃" 버튼이 마지막에 노출. [origin: mobile-settings-tab-spec §11 (Phase M v0.4)]
- [ ] **계정 카드 (Phase M)**: "로그아웃" 탭 → 확인 다이얼로그 노출 → "취소" 시 그대로 머무름 / "로그아웃" 시 토큰 삭제 + Login 화면 reset + info 토스트 "로그아웃했어요." 발화. [origin: mobile-settings-tab-spec §11 (Phase M v0.4)]
- [ ] **계정 카드 (Phase M)**: 라이트/다크 두 팔레트에서 danger 버튼이 4.5:1 이상 대비. [origin: mobile-settings-tab-spec §11 (Phase M v0.4)]

## 7) admin-web — Toast (`admin-toast-spec.md` §11)

총 11 항목. admin 토스트 v0.1 트랙 산출.

- [ ] FoodsPage 저장 성공 → 우상단 success 토스트 노출, 3.5s 후 자동 dismiss. [origin: admin-toast-spec §11]
- [ ] FoodsPage 저장 실패 → Drawer 안 banner + 우상단 error 토스트 둘 다 노출, 5s 후 자동 dismiss. [origin: admin-toast-spec §11]
- [ ] FoodsPage 비활성 전환 성공 → success 토스트 "비활성으로 전환했어요." [origin: admin-toast-spec §11]
- [ ] InquiriesPage 답변 등록 성공 → success 토스트 + Drawer 닫힘 + reload. [origin: admin-toast-spec §11]
- [ ] NoticesPage 작성 성공 → success 토스트 "공지를 저장했어요." [origin: admin-toast-spec §11]
- [ ] DashboardPage 재집계 성공 → success 토스트 "최신 통계로 반영했어요." [origin: admin-toast-spec §11]
- [ ] 빠르게 4개 액션 연속 실행 → 스택 최대 3개 유지(가장 오래된 자동 dismiss). [origin: admin-toast-spec §11]
- [ ] 토스트 닫기 버튼 → 즉시 dismiss. [origin: admin-toast-spec §11]
- [ ] 라이트/다크 두 팔레트에서 3 종류 토스트 모두 4.5:1 대비. [origin: admin-toast-spec §11]
- [ ] VoiceOver/스크린리더: success는 polite, error는 assertive. [origin: admin-toast-spec §11]
- [ ] 1024 / 768 뷰포트에서 우상단 위치·max-width 동작. [origin: admin-toast-spec §11]

## 8) admin-web — 5화면 dev smoke (`admin-stitch-gap-2026-05-08.md` §시각 점검 절차)

총 10 항목. admin-web v1.1 + 대시보드 통합 검증.

- [ ] server를 3000 포트에 띄우고(`npm run dev:server`) admin-web을 5174에서 띄운다(`npm run dev:admin`). 또는 임시 포트로 띄우려면 `vite.config.ts`의 proxy target을 일치시켜 재시작. [origin: admin-stitch-gap §시각 점검 1]
- [ ] `admin@example.com / admin123`으로 로그인 성공 → 토스트 + dashboard 진입. [origin: admin-stitch-gap §시각 점검 2 + Phase I LoginPage 토스트]
- [ ] 대시보드: 기간 셀렉트 변경 시 부제(`period.from ~ to`)/KPI 갱신. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 음식: 카테고리 셀렉트(한식/간식 등) 적용 후 결과 1건 이상 노출, 행 액션·드로어 동작. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 문의: 기간 7/30/90 적용, 행 클릭 드로어, 답변 등록 후 "completed" 라벨/`answeredAt` 표시. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 공지: 기간 적용, 모달 작성·수정·비활성/재활성. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 5상태: 토큰 만료(403/401) → ForbiddenState. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 5상태: 빈 결과 → EmptyState. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 5상태: 네트워크 차단 → 오류 배너. [origin: admin-stitch-gap §시각 점검 3]
- [ ] 1280px / 768px 두 뷰포트에서 사이드바·테이블·드로어가 깨지지 않는다. [origin: admin-stitch-gap §시각 점검 1+3]

## 9) 모바일 — MainTabs 탭 아이콘 (`mobile-settings-tab-spec.md` §13.5, Phase L → Phase M v0.5)

총 7 항목. Phase L 신설 → Phase M v0.5 Ionicons 업그레이드.

- [ ] 5탭 모두 Ionicons 아이콘 + 라벨이 한 줄에 표시(360px 폭에서 라벨 잘림 없음). [origin: mobile-settings-tab-spec §13.5 (Phase M v0.5)]
- [ ] 활성 탭 라벨·아이콘 색 = primary, 비활성 = fgMuted (둘 다 `tabBarActiveTintColor`/`tabBarInactiveTintColor` 정합). [origin: mobile-settings-tab-spec §13.5 (Phase M v0.5)]
- [ ] 활성 탭 아이콘이 filled 글리프(`home`, `restaurant`, `stats-chart`, `card`, `settings`)로 표시, 비활성 탭은 outline(`-outline`)으로 표시. [origin: mobile-settings-tab-spec §13.5 (Phase M v0.5)]
- [ ] 라이트/다크 두 팔레트에서 탭 바 배경·보더가 화면 본문과 자연스럽게 이어짐. [origin: mobile-settings-tab-spec §13.5]
- [ ] 빈번한 탭 전환 시 깜빡임 없이 즉시 active 색 적용. [origin: mobile-settings-tab-spec §13.5]
- [ ] VoiceOver/TalkBack에서 아이콘을 어나운싱하지 않고 라벨만 어나운싱. [origin: mobile-settings-tab-spec §13.5]
- [ ] iOS·Android 두 OS에서 동일한 글리프 렌더(이모지와 달리 OS 폰트 의존성 없음). [origin: mobile-settings-tab-spec §13.5 (Phase M v0.5)]

## 10) 모바일 — 알림 본 기능 (`mobile-notifications-spec.md` §12)

총 14 항목. Phase O 알림 본 기능 트랙(I1~I6) 산출.

- [ ] Settings → 알림 카드 첫 탭 → 권한 모달 노출(undetermined → 시스템 권한 다이얼로그). [origin: mobile-notifications-spec §12]
- [ ] 권한 허용 시 카드가 상태 B로 즉시 전환(토글 2개 + 시간 행 4개 + "모두 끄기" 텍스트 버튼 노출). [origin: mobile-notifications-spec §12]
- [ ] 권한 거부 시 카드가 상태 C로 전환 + "기기 설정 열기" 버튼 동작(`Linking.openSettings`). [origin: mobile-notifications-spec §12]
- [ ] 식사 토글 ON → 3개 시간 행 활성(08:00 / 12:30 / 18:30 기본값) + info 토스트 "식사 시간 알림을 켰어요." [origin: mobile-notifications-spec §12]
- [ ] 식사 토글 OFF → 3개 시간 행 흐릿(opacity 0.5) + 클릭 비활성 + info 토스트. [origin: mobile-notifications-spec §12]
- [ ] 권장량 미달 토글 ON → 1개 시간 행 활성(20:00 기본값) + info 토스트. [origin: mobile-notifications-spec §12]
- [ ] 시간 행 탭 → 모달 오픈 + 현재 값 프리셋(시·분 컬럼 자동 스크롤). [origin: mobile-notifications-spec §12]
- [ ] 모달 저장 → 토스트 "시간을 변경했어요." + 시간 행 갱신 + 토글 ON 상태면 reschedule. [origin: mobile-notifications-spec §12]
- [ ] "모두 끄기" → Alert → "모두 끄기" 확인 시 양 토글 OFF + info 토스트 "알림을 모두 껐어요." [origin: mobile-notifications-spec §12]
- [ ] 다크모드: 모든 카드/토글/모달/버튼 4.5:1 대비. [origin: mobile-notifications-spec §12]
- [ ] 라이트 → 다크 전환: 카드 색·보더·토글이 즉시 정합 적용. [origin: mobile-notifications-spec §12]
- [ ] iOS: 권한 거부 후 카드 → 기기 설정 → 권한 허용 후 앱 복귀 → AppState `active` 진입 시 자동 상태 B 재진입 + reconcile. [origin: mobile-notifications-spec §12 / §3.6]
- [ ] Android: OS 알림 설정에 `식사 시간 알림` / `권장량 미달 알림` 2채널이 분리 노출. [origin: mobile-notifications-spec §12]
- [ ] 실제 알림 발송: 시간을 1~2분 후로 변경 → 식사·권장량 미달 알림이 OS 알림으로 표시. 권장량 미달은 동적 본문(부족량 N g/kcal 포함). proteinGoalG/calorieGoalKcal이 null/0 또는 둘 다 충족된 사용자: 권장량 미달 알림 자체 미발송(예약 안 됨). [origin: mobile-notifications-spec §12]

## 11) 모바일 — 권장 계산 v1.4 (`recommendation-v14-spec.md` §8/§12)

총 14 항목. Phase P/B4 단계 4 산출. 자체 코드 점검은 §12에서 14/14 통과(스펙 v0.2). 실 디바이스에서 다시 확인.

ProfileEditScreen — 권장량 카드:
- [ ] 라벨 행 좌(라벨)·우(`v1.4`) 정렬이 깨지지 않는다(`flexDirection:'row'` + `space-between`). [origin: recommendation-v14-spec §8.1]
- [ ] 다크모드에서 `v1.4` caption(`fgMuted`)이 흐릿하지 않다(대비 충분). [origin: recommendation-v14-spec §8.2]
- [ ] 추정 보조 줄(`copy.estimate`)이 항상 노출된다(warnings 0건일 때도). [origin: recommendation-v14-spec §8.3]
- [ ] warnings 0건일 때 카드 높이가 v1.3 대비 1줄(추정 보조)만 늘어난다. [origin: recommendation-v14-spec §8.4]
- [ ] teen + floor 동시 발동 시 행이 순서대로 2개 표시되고 줄바꿈이 자연스럽다(teen → floor 순). [origin: recommendation-v14-spec §8.5]
- [ ] 텍스트 prefix `‘안내 · ’`가 모든 warnings 행에 일관 적용된다. [origin: recommendation-v14-spec §8.6]

OnboardingScreen:
- [ ] 저장 success 토스트 본문에 "추정"이라는 단어가 포함된다(`copy.onboardingDone`). [origin: recommendation-v14-spec §8.7]
- [ ] recalc 실패 토스트 본문은 기존 그대로다("권장량을 다시 계산하지 못했어요…"). [origin: recommendation-v14-spec §8.8]

Settings 알림 카드:
- [ ] "권장량 미달 알림" 토글 아래 helper 줄(`copy.notifHelper`)이 항상 보인다. [origin: recommendation-v14-spec §8.9]
- [ ] 토글 OFF 상태에서도 helper가 동일 톤으로 보인다. [origin: recommendation-v14-spec §8.10]
- [ ] 식사 알림 토글에는 helper가 추가되지 않는다. [origin: recommendation-v14-spec §8.11]

다크모드/접근성:
- [ ] 다크모드/라이트 모드에서 warnings 행이 `t.colors.warn`(light `#b45309` / dark `#fcd34d`)으로 surface2 위에서 충분히 읽힌다(Phase S 적용). [origin: recommendation-v14-spec §8.12 + Phase S]
- [ ] 스크린리더가 카드를 라벨/v1.4 → 권장량 → 보조 → warnings 순서로 읽는다(`accessibilityLabel="권장 계산 버전 v1.4"` 포함). [origin: recommendation-v14-spec §8.13]
- [ ] 토글 라벨 + helper가 별도 노드로 읽힌다. [origin: recommendation-v14-spec §8.14]

## 11.5) 모바일 — 권장량 사용자 override (`recommendation-override-spec.md` §8)

총 9 항목. Phase T(2026-05-10) 산출. 자체 코드 점검은 dev smoke `phase-t.mjs` 7/7로 가름. 실 디바이스에서 다시 확인.

ProfileEditScreen — 권장량 카드 하단 override 영역:
- [ ] 토글 OFF 기본 상태에서 helper(`override.toggleHelperOff`)가 1줄 표시되고, 입력 필드/reset/warning이 보이지 않는다. [origin: recommendation-override-spec §8.1]
- [ ] 토글 ON 즉시 입력 필드 2개 + medicalGeneric + reset 버튼이 한 번에 나타난다. [origin: recommendation-override-spec §8.2]
- [ ] ON 직후 입력 필드 prefill이 자동 권장값과 동일한 정수 문자열이다. [origin: recommendation-override-spec §8.3]
- [ ] 비정수 입력(예: "abc", "2.5") 시 클라이언트 검증 오류가 즉시 표시된다. [origin: recommendation-override-spec §8.4]
- [ ] 범위 helper(30~300 / 800~6000)가 항상 보인다. [origin: recommendation-override-spec §8.5]
- [ ] 저장 후 카드 권장량 수치가 입력값으로 갱신된다(자동 recalc이 호출되지 않음). [origin: recommendation-override-spec §8.6]
- [ ] "자동 추천으로 되돌리기" 누르면 토글 OFF + 카드 수치가 자동 권장값으로 즉시 갱신된다. [origin: recommendation-override-spec §8.7]
- [ ] medicalGeneric 행이 `t.colors.warn` 톤으로 라이트/다크 모두 가독. [origin: recommendation-override-spec §8.8]
- [ ] 스크린리더가 토글 → helper → 입력1 → 입력2 → warning → reset 순서로 읽는다. [origin: recommendation-override-spec §8.9]

## 12) 모바일 — Stitch Track C (홈·통계·기록·로그인·구독) (`diet-management-mockup-b-stitch.md`)

총 18 항목. Track C RN 반영(2026-05-16) 산출. 정적 검증: `npx tsc --noEmit -p apps/mobile` 통과.

### 홈 (`HomeScreen`, Stitch `edd17276…`)

- [ ] 라이트/다크: primary 녹색(`#16a34a`) 톤, legacy 파란 `#2563eb` 잔존 없음. [origin: Track C M1a]
- [ ] 로딩: 스피너만 표시, 카드 영역 깜빡임 없음. [origin: Track C M1a]
- [ ] 오류: danger `Banner` + "다시 시도" 동작. [origin: Track C M1a]
- [ ] 오늘 섭취 카드: kcal + P/C/F 한 줄 요약. [origin: Track C M1a + Phase W]
- [ ] 목표 달성: `ProgressBar` 2개(칼로리·단백질), v1.4 `warnings` warn 색 1줄. [origin: Track C M1a + Phase W]
- [ ] OCR 칩 + 4회 사전 배너(`ocr_remaining_1`) / 5회 소진 배너(`ocr_exhausted`) 식별. [origin: Track C M1a]
- [ ] 광고 카드: 무료 시 "표시 중", 프리미엄 시 "숨겨짐" 카피. [origin: Track C M1a]
- [ ] 프로필 목표 없음: 빈 카드 + "프로필 편집" CTA → `ProfileEdit` 이동. [origin: Track C M1a]

### 통계 (`StatsScreen`, Stitch `4ed4cdfc…`)

- [ ] `day|week|month` Segmented 전환 시 요약·충족률 갱신. [origin: Track C M1b]
- [ ] `isStale` 시 warn `Banner` + `aggregatedAt`·timezone 보조 텍스트. [origin: Track C M1b]
- [ ] 기록 없음: 빈 카드 + 기록 탭 CTA 문구. [origin: Track C M1b]
- [ ] 충족률 카드: profile goal 대비 칼로리·단백질 `ProgressBar`. [origin: Track C M1b + Phase W]

### 기록·OCR (`LogScreen`, Stitch `07a9c655…`)

- [ ] 상단 OCR primary CTA 강조, 수동/템플릿 Segmented. [origin: Track C M2]
- [ ] 4회 배너·5회 `PaywallModal` + checkout CTA (`premium_monthly`). [origin: Track C M2]
- [ ] 최근 기록 카드형 리스트(테이블 아님). [origin: Track C M2]

### 로그인 (`LoginScreen`, Stitch `6bb93f8a…` + Option B)

- [ ] 이메일·비밀번호 + "이메일로 로그인" → Main/Onboarding. [origin: Track C M3]
- [ ] 구분선 "또는 SNS로 로그인" 아래 네이버/구글/카카오. [origin: Track C M3]
- [ ] 스크롤 가능(작은 화면), 오류 danger `Banner`. [origin: Track C M3]

### 구독 (`SubscriptionScreen`, Stitch `fbad1cfc…`)

- [ ] 무료 vs 프리미엄 비교 카드 2개 + SKU·가격 카피. [origin: Track C M1c]
- [ ] 구독/복구 CTA + 토스트 성공·오류. [origin: Track C M1c]

## 13) 누적 합산

| 카테고리 | 항목 수 | 출처 |
|---|---|---|
| 모바일 — Onboarding | 8 | mobile-onboarding-spec |
| 모바일 — Profile Extra | 9 | mobile-profile-extra-spec |
| 모바일 — Theme Toggle | 10 | mobile-theme-toggle-spec §12 |
| 모바일 — Toast | 10 | mobile-toast-spec §11 |
| 모바일 — Settings 탭 | 13 | mobile-settings-tab-spec §11 (Phase M +3, Phase O 1건 deprecated) |
| 모바일 — MainTabs 탭 아이콘 | 7 | mobile-settings-tab-spec §13.5 (Phase M +1) |
| 모바일 — 알림 본 기능 | 14 | mobile-notifications-spec §12 (Phase O 신규) |
| 모바일 — 권장 계산 v1.4 | 14 | recommendation-v14-spec §8 (Phase P 신규) |
| 모바일 — 권장량 사용자 override | 9 | recommendation-override-spec §8 (Phase T 신규) |
| 모바일 — Stitch Track C | 18 | diet-management-mockup-b-stitch (Track C 신규) |
| admin-web — Toast | 11 | admin-toast-spec §11 |
| admin-web — 5화면 dev smoke | 10 | admin-stitch-gap §시각 점검 |
| **합계** | **133** | — |

> 단, §4의 1 항목(Subscription 탭 "테마 설정" 카드 위치)은 Phase J Settings 탭 이전으로 §6의 동등 항목에 의해 deprecated. §6의 1 항목(알림 슬롯 점선 보더)은 Phase O 본 기능 카드 도입으로 §10에 의해 deprecated. 실효 항목은 131개.

## 14) 변경 이력

- 2026-05-09 (v0.1 초안, Phase L t10): 6개 디자인 스펙 + admin-stitch-gap dev smoke § 합산 통합. 기존 직전 보고서 추정치 "47 항목"을 정확한 카운트(68)로 갱신. Phase J 영향으로 deprecated된 항목 1개 표기.
- 2026-05-09 (v0.2, Phase L t11): MainTabs 탭 아이콘 도입 트랙(t11) 산출 6 항목을 §9에 추가. 합산 68 → 74(실효 73).
- 2026-05-10 (v0.3, Phase M): Settings 계정 카드 신설(B1) + Ionicons 업그레이드(B2). §6 +3, §9 +1(이모지 opacity 항목 → filled/outline 항목 + iOS/Android 일관성 항목으로 갱신/신규). 합산 74 → 78(실효 77).
- 2026-05-10 (v0.4, Phase O): 알림 본 기능 신규(§10 14항). §6 알림 슬롯 항목 1개 deprecated(본 기능 카드로 대체). 합산 78 → 92(실효 90, deprecated 누적 2개).
- 2026-05-10 (v0.5, Phase P): 권장 계산 v1.4 신규(§11 14항). 합산 92 → 106(실효 104, deprecated 누적 2개 그대로).
- 2026-05-10 (v0.6, Phase S): §11 항목 12를 `t.colors.warn` 정식 적용으로 갱신(항목 수 변동 없음).
- 2026-05-10 (v0.7, Phase T): 권장량 사용자 override 신규(§11.5 9항). 합산 106 → 115(실효 113, deprecated 누적 2개 그대로).
- 2026-05-16 (v0.8, Track C): Stitch 모바일 RN 반영 시각 점검 신규(§12 18항). 합산 115 → 133(실효 131, deprecated 누적 2개 그대로).
