import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { DemoModeBanner } from './components/auth/DemoModeBanner';
import { useTheme } from './theme';

/** 시연 메뉴 — 주간 · 월간 · 식단 인사이트 */
const NAV = [
  { to: '/insights/weekly', label: '주간 리포트', end: true },
  { to: '/insights/monthly', label: '월간 패턴', end: true },
  { to: '/insights', label: '식단 인사이트', end: true },
] as const;

export function Layout() {
  const { token, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/demo', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <NavLink to="/insights" className="brand-link">
            nouryLog
          </NavLink>
          <div className="header-actions">
            <button type="button" className="btn-ghost btn-icon" onClick={toggle} aria-label="테마 전환">
              {dark ? '☀' : '☾'}
            </button>
            {token ? (
              <button type="button" className="btn-ghost btn-compact" onClick={handleLogout}>
                로그아웃
              </button>
            ) : (
              <NavLink to="/demo" className="btn-ghost btn-compact">
                로그인
              </NavLink>
            )}
          </div>
        </div>
        <nav className="nav-links" aria-label="인사이트 메뉴">
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
    </div>
  );
}
