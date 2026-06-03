import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { Banner } from '../components/ui/Banner';
import { consumeNaverOAuthState, getNaverRedirectUri } from '../social/naverWeb';

export function NaverOAuthCallbackPage() {
  const { loginNaverCode, token, ready } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (token) {
      nav('/ai/coach', { replace: true });
      return;
    }

    const code = params.get('code');
    const state = params.get('state') ?? '';
    const oauthErr = params.get('error');
    if (oauthErr) {
      setErr('네이버 로그인이 취소되었거나 실패했습니다.');
      return;
    }
    if (!code) {
      setErr('인증 코드가 없습니다.');
      return;
    }

    const { ok, next } = consumeNaverOAuthState(state);
    if (!ok) {
      setErr('로그인 상태가 만료되었습니다. 다시 시도해 주세요.');
      return;
    }

    void loginNaverCode(code, getNaverRedirectUri())
      .then(() => nav(next, { replace: true }))
      .catch((e) => setErr(e instanceof Error ? e.message : '네이버 로그인 실패'));
  }, [ready, token, params, loginNaverCode, nav]);

  return (
    <div className="demo-landing">
      <div className="card auth-gate-loading">
        {err ? <Banner variant="error">{err}</Banner> : <p className="muted">네이버 로그인 처리 중…</p>}
        {err ? (
          <p style={{ marginTop: '1rem' }}>
            <a href="/demo">로그인으로 돌아가기</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
