import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="card auth-gate-loading">
        <p className="muted">준비 중…</p>
      </div>
    );
  }

  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    // auto=1은 README /demo?auto=1 전용. 로그아웃·세션 만료 시에는 로그인 화면만 표시.
    return <Navigate to={`/demo?next=${next}`} replace />;
  }

  return <>{children}</>;
}
