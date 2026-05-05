import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../useTheme';

const nav = [
  { to: '/app/onboard', label: '온보딩' },
  { to: '/app/home', label: '홈' },
  { to: '/app/log', label: '기록' },
  { to: '/app/stats', label: '통계' },
  { to: '/app/subscription', label: '구독' },
];

export function AppLayout() {
  const { toggle } = useTheme();
  return (
    <div className="mobile-frame">
      <div className="mobile-body">
        <div className="top-bar">
          <NavLink to="/" style={{ fontSize: '0.85rem' }}>
            ← 허브
          </NavLink>
          <button type="button" className="btn btn-ghost" onClick={toggle}>
            테마
          </button>
        </div>
        <Outlet />
      </div>
      <nav className="mobile-nav" aria-label="앱 하단 탭">
        {nav.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
