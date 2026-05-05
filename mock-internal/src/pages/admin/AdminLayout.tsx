import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../useTheme';

const links = [
  { to: '/admin/dashboard', label: '대시보드' },
  { to: '/admin/members', label: '회원' },
  { to: '/admin/foods', label: '음식' },
  { to: '/admin/inquiries', label: '문의' },
  { to: '/admin/notices', label: '공지' },
];

export function AdminLayout() {
  const { toggle } = useTheme();
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <strong>관리자</strong>
          <button type="button" className="btn btn-ghost" onClick={toggle}>
            테마
          </button>
        </div>
        <NavLink to="/">← 목업 허브</NavLink>
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
