import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav('/dashboard');
    } catch (er) {
      setErr(er instanceof Error ? er.message : '오류');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
        <h1 style={{ marginTop: 0 }}>관리자 로그인</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>시드 계정: admin@example.com / admin123</p>
        {err && <div className="banner banner-danger">{err}</div>}
        <form onSubmit={(e) => void onSubmit(e)}>
          <label className="row" style={{ flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
            이메일
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="row" style={{ flexDirection: 'column', alignItems: 'stretch', width: '100%', marginTop: 12 }}>
            비밀번호
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} disabled={busy}>
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </main>
  );
}
