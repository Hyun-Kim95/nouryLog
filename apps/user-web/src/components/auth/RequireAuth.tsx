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
    return <Navigate to={`/demo?auto=1&next=${next}`} replace />;
  }

  return <>{children}</>;
}
