/**
 * Stitch 3차 세트 — 앱에 있으나 Stitch에 없던 화면
 * SSOT: docs/design/mobile-social-login-option-b.md,
 *       docs/design/mobile-settings-tab-spec.md v0.5,
 *       docs/design/mobile-notifications-spec.md v0.2,
 *       docs/design/mobile-profile-extra-spec.md,
 *       apps/mobile LoginScreen / SignUpScreen / PolicyViewScreen
 */
import type { DeviceType } from './briefs.js';

export type MissingScreenKey =
  | 'APP_LOGIN'
  | 'APP_SIGNUP'
  | 'APP_SETTINGS'
  | 'APP_PROFILE_EDIT'
  | 'APP_POLICY_VIEW';

export type MissingScreenBrief = {
  key: MissingScreenKey;
  title: string;
  deviceType: DeviceType;
  prompt: string;
};

const COMMON_PREFIX = `
컨텍스트: 식단 관리 모바일 앱 nouryLog — 식단 기록·영양 통계·구독.
디자인 시스템: DietManagement DS v1 (그린 primary #16a34a). 라이트·다크 모드 모두 지원.
접근성: WCAG AA, 텍스트 대비 4.5:1 이상, 아이콘+텍스트 라벨 병기.
카피: 한국어 격식체("...합니다/해요"). 모바일 390×844, Safe Area, 하단 탭 바 높이 고려.
`.trim();

export const BRIEFS_MISSING: MissingScreenBrief[] = [
  {
    key: 'APP_LOGIN',
    title: 'APP_LOGIN · 로그인 (이메일 + SNS 분리)',
    deviceType: 'MOBILE',
    prompt: `
${COMMON_PREFIX}

화면: 모바일 로그인 (APP_LOGIN) — Option B Segmented 레이아웃.
상단: 앱명 "식단 관리" + 부제 "오늘 먹은 것을 기록하고 권장량을 확인하세요."

[영역 1 — 이메일 로그인]
- 이메일 TextField(placeholder "이메일")
- 비밀번호 TextField(placeholder "비밀번호", secure)
- primary 풀폭 버튼 "이메일로 로그인"
- 보조 링크 "회원가입" (우측 정렬)

구분선 가운데 텍스트: "또는 SNS로 로그인"

[영역 2 — SNS 로그인]
- 네이버 브랜드 색 버튼 "네이버 로그인" (#03C75A 배경, 흰 글자)
- 구글 버튼 "구글 로그인" (#4285F4)
- 카카오 버튼 "카카오 로그인" (#FEE500 배경, 검정 글자)

[데모 상태 — 계정 충돌 인라인 카드]
SNS 영역 아래 카드:
- 제목 "기존 계정과 이메일이 충돌합니다."
- 부제 "대상: user@example.com"
- 버튼 3개: primary "기존 계정 연결", secondary "새 SNS 계정 생성", ghost "취소"

상태 UI(섹션 라벨로 5종 시연 가능하면 한 화면에 스크롤):
- 기본 / 로딩(버튼 스피너) / 오류(상단 danger 배너) / 완료(토스트 자리) / 권한(SNS 거부 안내)

하단 여백 충분히. 스크롤 가능.
`.trim(),
  },
  {
    key: 'APP_SIGNUP',
    title: 'APP_SIGNUP · 회원가입',
    deviceType: 'MOBILE',
    prompt: `
${COMMON_PREFIX}

화면: 모바일 회원가입 (APP_SIGNUP).
헤더: 뒤로 "←" + 제목 "회원가입".

폼(세로 스택):
1. 이메일 입력
2. 비밀번호 입력 (8자 이상 도움말)
3. 비밀번호 확인

필수 동의 체크박스 3개:
- "만 14세 이상입니다."
- "이용약관에 동의합니다." + "보기" 링크
- "개인정보처리방침에 동의합니다." + "보기" 링크

sticky 하단 primary "가입하기"

보조: "이미 계정이 있으신가요? 로그인" 텍스트 링크

상태: 기본 / 로딩 / 필드 검증 오류(인라인 빨간 메시지) / 서버 오류 배너
`.trim(),
  },
  {
    key: 'APP_SETTINGS',
    title: 'APP_SETTINGS · 설정 탭',
    deviceType: 'MOBILE',
    prompt: `
${COMMON_PREFIX}

화면: 모바일 설정 탭 (APP_SETTINGS) — MainTabs 5번째 탭 활성.
하단 탭 바 표시: 홈 | 기록 | 통계 | 구독 | 설정(활성, primary 색).

본문 ScrollView:
헤더 "설정" + 부제 "프로필·테마·알림을 한 곳에서 관리해요."

카드 1 — 내 프로필:
- 설명 2줄 + primary 버튼 "프로필 편집"

카드 2 — 테마:
- 설명 + Segmented 컨트롤 [라이트 | 다크] (다크 선택됨 예시)

카드 3 — 알림 (권한 허용·기능 ON 상태, Phase O 본문):
- 우측 상단 danger 텍스트 "모두 끄기"
- 토글 "식사 시간 알림" ON
  - 하위 행: 아침 08:00 › / 점심 12:30 › / 저녁 18:30 ›
- 토글 "권장량 미달 알림" ON
  - 하위 행: 매일 20:00 ›

카드 4 — 계정:
- 설명 + danger 풀폭 버튼 "로그아웃"

카드 간격 12px, surface 카드 + border 1px, radius 8px.
`.trim(),
  },
  {
    key: 'APP_PROFILE_EDIT',
    title: 'APP_PROFILE_EDIT · 프로필 편집',
    deviceType: 'MOBILE',
    prompt: `
${COMMON_PREFIX}

화면: 모바일 프로필 편집 (APP_PROFILE_EDIT).
상단 바: ← 뒤로 + 제목 "프로필 편집"

필드 스택:
- 성별 Segmented [남 | 여 | 응답하지 않음]
- 나이 (세), 신장 (cm), 체중 (kg) — 각 Field 라벨+입력+단위 suffix
- 활동량 Radio 4옵션 (거의 없음/가벼움/보통/활동적) + 1줄 예시
- 목표 Radio 3옵션 (감량/유지/증량)

읽기 전용 카드 "권장량":
- "단백질 95 g · 칼로리 1,850 kcal"
- 보조 "v1.4 자동 계산 · 마지막 갱신 2026-05-10 14:00"
- warnings 한 줄 amber 톤: "고령 사용자에게는 보수적인 칼로리 조정이 적용됩니다."

sticky 하단: primary "저장" + text "취소"

상태: 기본(일부 값 채움) / 저장 로딩 / 필드 오류 인라인
`.trim(),
  },
  {
    key: 'APP_POLICY_VIEW',
    title: 'APP_POLICY_VIEW · 약관 보기',
    deviceType: 'MOBILE',
    prompt: `
${COMMON_PREFIX}

화면: 모바일 정책 문서 뷰어 (APP_POLICY_VIEW) — 이용약관 예시.
상단 바: ← + 제목 "이용약관"
부제 작은 글씨: "버전 2026-05-01"

본문 ScrollView — 마크다운 스타일 장문:
- H2 "제1장 총칙"
- 본문 단락 3~4줄 샘플(lorem 대신 한국어 약관 톤)
- H2 "제2장 서비스 이용"
- bullet 목록 3항
- H2 "제3장 개인정보"

상태: 기본(본문 표시) / 로딩(중앙 스피너) / 오류(배너 "문서를 불러오지 못했습니다")

다크모드에서 본문 fgMuted 대비 확보. 코드블록 없음.
`.trim(),
  },
];
