import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useToast } from '../toast/useToast';

type LoginLocationState = { reason?: 'auth_required' } | null;

export function LoginPage() {
  const { login, isAdmin } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const sessionReason = (location.state as LoginLocationState)?.reason;
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAdmin) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.show({ kind: 'success', message: '로그인했어요.' });
      nav('/dashboard');
    } catch (er) {
      const msg = er instanceof Error ? er.message : '오류';
      setErr(msg);
      toast.show({ kind: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card login-card">
      <div className="login-brand">
        <span className="sidebar-brand-mark" aria-hidden="true">
          N
        </span>
        <span>nouryLog 관리자</span>
      </div>
      <p className="login-subtitle">시드 계정: admin@example.com / admin123</p>
      {sessionReason === 'auth_required' ? (
        <div className="banner banner-warn">로그인이 필요합니다. 관리자 계정으로 다시 로그인해 주세요.</div>
      ) : null}
      {err && <div className="banner banner-danger">{err}</div>}
      <form onSubmit={(e) => void onSubmit(e)} className="login-form">
        <label className="login-field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="login-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={busy}
        >
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
