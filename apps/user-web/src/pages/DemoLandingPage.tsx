import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { BrandLeafIcon, DemoIcon, KakaoIcon, NaverIcon } from '../components/auth/LoginProviderIcons';
import { Banner } from '../components/ui/Banner';
import { DEMO_COPY } from '../copy/demo';
import { demoAutoLoginEnabled, getDemoCredentials } from '../lib/demoCredentials';
import { kakaoWebConfigured, loginWithKakaoWeb } from '../social/kakaoWeb';
import { buildNaverAuthorizeUrl, naverWebConfigured, saveNaverOAuthState } from '../social/naverWeb';
import { useTheme } from '../theme';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

/** /demo — A안 소프트 히어로 카드 로그인 */
export function DemoLandingPage() {
  const { token, ready, loginEmail, loginGoogleIdToken, loginSocialAccessToken } = useAuth();
  const { dark, toggle } = useTheme();
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
      <div className="demo-login-page">
        <div className="demo-login-page__inner">
          <div className="demo-login-card demo-login-card--loading">
            <p className="muted">준비 중…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-login-page">
      <div className="demo-login-page__pattern" aria-hidden="true" />
      <button
        type="button"
        className="demo-login-theme-toggle btn-ghost btn-icon"
        onClick={toggle}
        aria-label="테마 전환"
      >
        {dark ? '☀' : '☾'}
      </button>

      <div className="demo-login-page__inner">
        <div className="demo-login-brand">
          <BrandLeafIcon className="demo-login-brand__icon" />
          <span className="demo-login-brand__name">{DEMO_COPY.brand}</span>
        </div>

        <section className="demo-login-card" aria-labelledby="demo-login-title">
          <h1 id="demo-login-title" className="demo-login-card__title">
            {DEMO_COPY.heroTitle}
          </h1>
          <p className="demo-login-card__tagline">{DEMO_COPY.heroTagline}</p>

          {!hasCredentials ? <Banner variant="warn">{DEMO_COPY.envSetupHint}</Banner> : null}
          {err ? <Banner variant="error">{err}</Banner> : null}

          <div className="demo-login-actions">
            {googleClientId ? (
              <GoogleSignInButton
                disabled={busy}
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
              />
            ) : (
              <p className="muted demo-login-env-hint">{DEMO_COPY.googleEnvHint}</p>
            )}

            <button
              type="button"
              className="login-btn login-btn--kakao"
              disabled={busy || !kakaoWebConfigured()}
              onClick={() => void startKakao()}
            >
              <KakaoIcon className="login-btn__icon" />
              <span>{DEMO_COPY.ctaKakao}</span>
            </button>
            {!kakaoWebConfigured() ? (
              <p className="muted demo-login-env-hint">{DEMO_COPY.kakaoEnvHint}</p>
            ) : null}

            <button
              type="button"
              className="login-btn login-btn--naver"
              disabled={busy || !naverWebConfigured()}
              onClick={startNaver}
            >
              <NaverIcon className="login-btn__icon" />
              <span>{DEMO_COPY.ctaNaver}</span>
            </button>
            {!naverWebConfigured() ? (
              <p className="muted demo-login-env-hint">{DEMO_COPY.naverEnvHint}</p>
            ) : null}

            <button
              type="button"
              className="login-btn login-btn--demo"
              disabled={busy}
              onClick={() => void startDemo()}
            >
              <DemoIcon className="login-btn__icon" />
              <span>{busy ? DEMO_COPY.ctaDemoLoading : DEMO_COPY.ctaDemo}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
