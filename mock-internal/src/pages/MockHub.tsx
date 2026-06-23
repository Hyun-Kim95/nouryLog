import { Link } from 'react-router-dom';
import { ContractProbe } from '../components/ContractProbe';
import { useTheme } from '../useTheme';

export function MockHub() {
  const { dark, toggle } = useTheme();
  return (
    <div className="page">
      <div className="top-bar">
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>식단 관리 이중 목업 — 안 A (자체)</h1>
        <button type="button" className="btn" onClick={toggle} aria-pressed={dark}>
          {dark ? '다크 모드' : '라이트 모드'} 전환
        </button>
      </div>
      <p style={{ color: 'var(--muted)' }}>
        PRD 승인본 기준 프로토타입입니다. 화면은 정적 상태 데모이며, 개발 모드에서는 MSW로 계약 스텁과 동일한 응답을 프로브할 수 있습니다. 공통 브리프:{' '}
        <code>docs/agent/diet-management-dual-mockup-brief.md</code>
      </p>
      <ContractProbe />
      <div className="card">
        <h2 style={{ marginTop: 0 }}>모바일 앱 목업</h2>
        <p>
          <Link to="/app/home">앱 목업 열기 (/app/home)</Link>
        </p>
        <ul>
          <li>
            <Link to="/app/onboard">APP_ONBOARD 온보딩·로그인</Link>
          </li>
          <li>
            <Link to="/app/home">APP_HOME 홈</Link>
          </li>
          <li>
            <Link to="/app/log">APP_LOG_OCR 기록·OCR·페이월</Link>
          </li>
          <li>
            <Link to="/app/stats">APP_STATS 통계·stale</Link>
          </li>
          <li>
            <Link to="/app/food-search">APP_FOOD_SEARCH 음식 검색·이력·빈도 (신규)</Link>
          </li>
          <li>
            <Link to="/app/subscription">APP_SUB_SETTINGS 구독·복구</Link>
          </li>
        </ul>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>관리자 웹 목업</h2>
        <p>
          <Link to="/admin/dashboard">관리자 목업 열기</Link>
        </p>
        <ul>
          <li>
            <Link to="/admin/dashboard">ADM_DASH 대시보드·재집계</Link>
          </li>
          <li>
            <Link to="/admin/members">ADM_MEMBERS 회원</Link>
          </li>
          <li>
            <Link to="/admin/foods">ADM_FOODS 음식</Link>
          </li>
          <li>
            <Link to="/admin/inquiries">ADM_INQUIRIES 문의</Link>
          </li>
          <li>
            <Link to="/admin/notices">ADM_NOTICES 공지</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
