import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { useTheme } from './theme';

const NAV_ITEMS: { to: string; label: string; icon: string }[] = [
  { to: '/dashboard', label: '대시보드', icon: '◉' },
  { to: '/members', label: '회원', icon: '◐' },
  { to: '/foods', label: '음식', icon: '◇' },
  { to: '/inquiries', label: '문의', icon: '◔' },
  { to: '/notices', label: '공지', icon: '◑' },
  { to: '/policies', label: '정책 문서', icon: '◈' },
];

const PATH_TITLE: Record<string, string> = {
  '/dashboard': '대시보드',
  '/members': '회원 관리',
  '/foods': '음식 템플릿',
  '/inquiries': '문의 관리',
  '/notices': '공지 관리',
  '/policies': '정책 문서',
};

export function Layout() {
  const { logout, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (!isAdmin) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Outlet />
        </div>
      </div>
    );
  }

  const title = PATH_TITLE[location.pathname] ?? '관리자';

  return (
    <div className="layout" data-drawer={drawerOpen ? 'open' : 'closed'}>
      <aside className="sidebar" aria-label="주 메뉴">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">
            N
          </span>
          nouryLog
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggle}
            aria-pressed={dark}
          >
            {dark ? '☀ 라이트 모드' : '☾ 다크 모드'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="메뉴 닫기"
        onClick={() => setDrawerOpen(false)}
      />

      <header className="app-header">
        <div className="cluster">
          <button
            type="button"
            className="menu-toggle"
            aria-label="메뉴 열기"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            ≡
          </button>
          <span className="app-header-title">{title}</span>
        </div>
        <div className="app-header-actions">
          <span id="page-actions-slot" />
        </div>
      </header>

      <Outlet />
    </div>
  );
}
