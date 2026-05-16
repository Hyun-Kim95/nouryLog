/**
 * Stitch 4차 세트 — 1차 합본 화면을 브리프 ID별 단독 스크린으로 분리
 * SSOT: docs/agent/diet-management-dual-mockup-brief.md,
 *       mock-internal AppStats / AppSubscription / AdminDashboard / AdminTablePage(members)
 */
import type { DeviceType } from './briefs.js';

export type SplitScreenKey =
  | 'APP_STATS'
  | 'APP_SUB_SETTINGS'
  | 'ADM_DASH'
  | 'ADM_MEMBERS'
  | 'APP_POLICY_PRIVACY';

export type SplitScreenBrief = {
  key: SplitScreenKey;
  title: string;
  deviceType: DeviceType;
  prompt: string;
};

const MOBILE_PREFIX = `
컨텍스트: 식단 관리 모바일 앱 nouryLog.
디자인 시스템: DietManagement DS v1 (그린 primary #16a34a). 라이트·다크 지원.
모바일 390×844, 하단 탭 바(홈·기록·통계·구독·설정). WCAG AA, 한국어.
`.trim();

const DESKTOP_PREFIX = `
컨텍스트: 식단 관리 관리자 웹 nouryLog.
디자인 시스템: DietManagement DS v1. DESKTOP 1440px+, 좌측 사이드바 240px.
WCAG AA, 한국어. 상단 필터·테이블 15행·하단 중앙 페이지네이션·검색 우측 초기화.
`.trim();

const ADMIN_TABLE_RULES = `
관리자 목록 표준: 필터 상단, 검색+[초기화], 15행, 하단 중앙 ‹ 1·2·3 ›, 비활성 포함 토글.
`.trim();

export const BRIEFS_SPLIT: SplitScreenBrief[] = [
  {
    key: 'APP_STATS',
    title: 'APP_STATS · 통계 (단독)',
    deviceType: 'MOBILE',
    prompt: `
${MOBILE_PREFIX}

화면: 통계 탭 ONLY (APP_STATS) — 하단 탭에서 "통계" 활성.
구독/설정 내용은 절대 넣지 말 것.

본문:
1. stale 경고 배너(amber): "최신 반영 지연 · 마지막 배치 2026-05-10 03:00 (staleHours 7)"
2. 기간 Segmented: [하루 | 주 | 월] — "주" 선택됨
3. 요약 카드: 칼로리 막대, 단백질/탄수/지방 수치 3열
4. 타임존 보조: "Asia/Seoul · aggregatedAt 표시"

상태 UI 섹션(스크롤로 5종 라벨):
- 기본(위 레이아웃) / 로딩(스켈레톤) / 빈("이 기간에 기록이 없습니다") / 오류 배너 / (권한 N/A)

OCR·구독·프로필 필드 없음.
`.trim(),
  },
  {
    key: 'APP_SUB_SETTINGS',
    title: 'APP_SUB_SETTINGS · 구독 (단독)',
    deviceType: 'MOBILE',
    prompt: `
${MOBILE_PREFIX}

화면: 구독 탭 ONLY (APP_SUB_SETTINGS) — 하단 탭 "구독" 활성.
통계 차트·stale 배너는 넣지 말 것.

본문:
1. 현재 플랜 뱃지 "무료 플랜"
2. 혜택 리스트: OCR 무료 5회 누적 / 하단 광고 노출
3. 비교 카드 2열 또는 스택:
   - 무료 vs 프리미엄(premium_monthly 월 4,900원)
4. primary CTA "premium_monthly 구독하기"
5. secondary "구매 복구 (restore)"
6. 보조 카피: "프리미엄: OCR 추가 사용 + 광고 제거 (단일 SKU)"

상태: 기본 / 로딩 / 오류("결제 상태 확인 실패" + 재시도) / 완료("구독이 활성화되었습니다" 토스트 자리)

설정·알림·프로필 편집 링크는 본 화면에 없음(설정 탭으로 분리됨).
`.trim(),
  },
  {
    key: 'ADM_DASH',
    title: 'ADM_DASH · 운영 대시보드 (단독)',
    deviceType: 'DESKTOP',
    prompt: `
${DESKTOP_PREFIX}

화면: 관리자 대시보드 ONLY (ADM_DASH) — 회원 목록 테이블은 넣지 말 것.
사이드바 "대시보드" 메뉴 활성.

본문:
1. 헤더: "운영 대시보드" + 기간 셀렉트(7일/30일/90일) + 부제 "2026-05-03 ~ 2026-05-10 · Asia/Seoul"
2. KPI 카드 행 4개: 신규 가입 128 / 활성 사용자 3.4k / 기록 건수 41k / 미처리 문의 12
3. 지연 위젯 카드(warn 톤): "통계 배치 지연 · staleHours > 6h 테넌시 존재"
4. primary 버튼 "최신값 반영" (POST /admin/stats/reaggregate 대응)

상태: 기본 / 로딩(KPI 스켈레톤) / 오류(상단 배너)

음식·문의·공지 테이블·페이지네이션 없음.
`.trim(),
  },
  {
    key: 'ADM_MEMBERS',
    title: 'ADM_MEMBERS · 회원 목록 (단독)',
    deviceType: 'DESKTOP',
    prompt: `
${DESKTOP_PREFIX}

화면: 관리자 회원 목록 ONLY (ADM_MEMBERS) — KPI 대시보드 위젯 없음.
사이드바 "회원" 메뉴 활성. 헤더 타이틀 "회원 관리".

필터 바: 검색(이메일/닉네임), 상태(전체/활성/비활성), 비활성 포함 체크, [검색][초기화].

테이블 컬럼: 회원 ID / 이메일 / 상태 뱃지 / 가입일 / 최근 접속.
15행 샘플 데이터. 행 hover.

페이지네이션 하단 중앙: ‹ 1 2 3 › · "페이지당 15건 · 총 128건"

상태: 기본 / 로딩(5행 스켈레톤) / 빈 / 오류 / 권한 제한 안내 카드

${ADMIN_TABLE_RULES}
`.trim(),
  },
  {
    key: 'APP_POLICY_PRIVACY',
    title: 'APP_POLICY_PRIVACY · 개인정보처리방침',
    deviceType: 'MOBILE',
    prompt: `
${MOBILE_PREFIX}

화면: 정책 뷰어 (APP_POLICY_VIEW privacy 변형) — APP_POLICY_VIEW(이용약관)과 동일 레이아웃, 본문만 다름.
상단: ← + 제목 "개인정보처리방침" + 버전 "2026-05-01"

본문 ScrollView 마크다운 톤:
- "제1조 수집하는 개인정보 항목" (이메일, 프로필, 식사 기록 등 bullet)
- "제2조 이용 목적"
- "제3조 보관 기간"
- "제4조 제3자 제공" (없음 명시)

상태: 기본 / 로딩 / 오류 배너
`.trim(),
  },
];
