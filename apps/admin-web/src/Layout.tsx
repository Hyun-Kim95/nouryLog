import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import { useTheme } from './theme';

export function Layout() {
  const { logout, token } = useAuth();
  const { dark, toggle } = useTheme();

  if (!token) return <Outlet />;

  return (
    <div className="layout">
      <header className="topbar">
        <nav className="nav" aria-label="주 메뉴">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            대시보드
          </NavLink>
          <NavLink to="/members" className={({ isActive }) => (isActive ? 'active' : '')}>
            회원
          </NavLink>
          <NavLink to="/foods" className={({ isActive }) => (isActive ? 'active' : '')}>
            음식
          </NavLink>
          <NavLink to="/inquiries" className={({ isActive }) => (isActive ? 'active' : '')}>
            문의
          </NavLink>
          <NavLink to="/notices" className={({ isActive }) => (isActive ? 'active' : '')}>
            공지
          </NavLink>
        </nav>
        <div className="row">
          <button type="button" className="btn" onClick={toggle} aria-pressed={dark}>
            {dark ? '라이트 모드' : '다크 모드'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
