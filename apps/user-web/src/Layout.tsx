import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import { DemoModeBanner } from './components/auth/DemoModeBanner';
import { useTheme } from './theme';

/** 시연 메뉴 없음 — 주간 · 월간 · AI 코치만 */
const NAV = [
  { to: '/ai/weekly', label: '주간 리포트', end: true },
  { to: '/ai/monthly', label: '월간 패턴', end: true },
  { to: '/ai/coach', label: 'AI 코치', end: true },
] as const;

export function Layout() {
  const { token, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <NavLink to="/ai/coach" className="brand-link">
            nouryLog AI
          </NavLink>
          <div className="header-actions">
            <button type="button" className="btn-ghost btn-icon" onClick={toggle} aria-label="테마 전환">
              {dark ? '☀' : '☾'}
            </button>
            {token ? (
              <button type="button" className="btn-ghost btn-compact" onClick={logout}>
                로그아웃
              </button>
            ) : (
              <NavLink to="/demo" className="btn-ghost btn-compact">
                로그인
              </NavLink>
            )}
          </div>
        </div>
        <nav className="nav-links" aria-label="AI 메뉴">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <DemoModeBanner />
        <Outlet />
      </main>
      <footer className="demo-footer muted">
        AI 미리보기 — 실제 기록·구독은 모바일 앱
      </footer>
    </div>
  );
}
