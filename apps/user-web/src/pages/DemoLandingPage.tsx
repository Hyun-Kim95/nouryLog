import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../auth';
import { Banner } from '../components/ui/Banner';
import { DEMO_COPY } from '../copy/demo';
import { demoAutoLoginEnabled, getDemoCredentials } from '../lib/demoCredentials';
import { kakaoWebConfigured, loginWithKakaoWeb } from '../social/kakaoWeb';
import { buildNaverAuthorizeUrl, naverWebConfigured, saveNaverOAuthState } from '../social/naverWeb';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

/** /demo — 로그인 전용. 데모(상단) + SNS(하단) */
export function DemoLandingPage() {
  const { token, ready, loginEmail, loginGoogleIdToken, loginSocialAccessToken } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = params.get('next') ?? '/ai/coach';
  const auto = params.get('auto') === '1';
  const hasCredentials = demoAutoLoginEnabled();

  useEffect(() => {
    if (!ready || !auto || token) return;
    const cred = getDemoCredentials();
    if (!cred) return;
    setBusy(true);
    void loginEmail(cred.email, cred.password, 'demo')
      .then(() => nav(next, { replace: true }))
      .catch((e) => setErr(e instanceof Error ? e.message : '로그인 실패'))
      .finally(() => setBusy(false));
  }, [ready, auto, token, loginEmail, nav, next]);

  useEffect(() => {
    if (ready && token) nav(next, { replace: true });
  }, [ready, token, nav, next]);

  const startDemo = async () => {
    const cred = getDemoCredentials();
    if (!cred) {
      setErr(DEMO_COPY.ctaNoCredentials);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await loginEmail(cred.email, cred.password, 'demo');
      nav(next, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  const startKakao = async () => {
    setBusy(true);
    setErr(null);
    try {
      const accessToken = await loginWithKakaoWeb();
      await loginSocialAccessToken('kakao', accessToken);
      nav(next, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '카카오 로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  const startNaver = () => {
    setErr(null);
    try {
      const state = crypto.randomUUID();
      saveNaverOAuthState(state, next);
      window.location.href = buildNaverAuthorizeUrl(state);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '네이버 로그인 실패');
    }
  };

  if (!ready) {
    return (
      <div className="card auth-gate-loading">
        <p className="muted">준비 중…</p>
      </div>
    );
  }

  return (
    <div className="demo-landing">
      <section className="demo-hero card">
        <h1>{DEMO_COPY.heroTitle}</h1>
        <p className="demo-hero-sub">{DEMO_COPY.heroSubtitle}</p>
        <p className="muted">{DEMO_COPY.heroNote}</p>
        {!hasCredentials ? <Banner variant="warn">{DEMO_COPY.envSetupHint}</Banner> : null}
        {err ? <Banner variant="error">{err}</Banner> : null}

        <button type="button" className="btn" disabled={busy} onClick={() => void startDemo()}>
          {busy ? DEMO_COPY.ctaDemoLoading : DEMO_COPY.ctaDemo}
        </button>
        <p className="muted demo-readme-hint">
          <code>/demo?auto=1</code> — {DEMO_COPY.readmeHint}
        </p>

        <div className="login-divider" aria-hidden>
          <span>{DEMO_COPY.snsDivider}</span>
        </div>

        <div className="sns-login-stack">
          {googleClientId ? (
            <div className="google-login-wrap">
              <GoogleLogin
                onSuccess={(cred) => {
                  if (!cred.credential) {
                    setErr('Google 인증 정보를 받지 못했습니다.');
                    return;
                  }
                  setBusy(true);
                  setErr(null);
                  void loginGoogleIdToken(cred.credential)
                    .then(() => nav(next, { replace: true }))
                    .catch((e) => setErr(e instanceof Error ? e.message : 'Google 로그인 실패'))
                    .finally(() => setBusy(false));
                }}
                onError={() => setErr('Google 로그인에 실패했습니다.')}
                text="signin_with"
                shape="rectangular"
                width="320"
              />
            </div>
          ) : (
            <p className="muted">{DEMO_COPY.googleEnvHint}</p>
          )}

          <button
            type="button"
            className="btn btn-kakao"
            disabled={busy || !kakaoWebConfigured()}
            onClick={() => void startKakao()}
          >
            {DEMO_COPY.ctaKakao}
          </button>
          {!kakaoWebConfigured() ? <p className="muted sns-env-hint">{DEMO_COPY.kakaoEnvHint}</p> : null}

          <button
            type="button"
            className="btn btn-naver"
            disabled={busy || !naverWebConfigured()}
            onClick={startNaver}
          >
            {DEMO_COPY.ctaNaver}
          </button>
          {!naverWebConfigured() ? <p className="muted sns-env-hint">{DEMO_COPY.naverEnvHint}</p> : null}
        </div>
      </section>
      <div className="action-grid">
        <Link to="/ai/weekly" className="action-card">
          <span className="action-card-title">{DEMO_COPY.featureWeekly}</span>
        </Link>
        <Link to="/ai/monthly" className="action-card">
          <span className="action-card-title">{DEMO_COPY.featureMonthly}</span>
        </Link>
        <Link to="/ai/coach" className="action-card">
          <span className="action-card-title">{DEMO_COPY.featureCoach}</span>
        </Link>
      </div>
    </div>
  );
}
