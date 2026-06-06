import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { GoogleIcon } from './LoginProviderIcons';
import { DEMO_COPY } from '../../copy/demo';

type Props = {
  disabled?: boolean;
  onSuccess: (cred: CredentialResponse) => void;
  onError: () => void;
};

/** 커스텀 login-btn 라벨 + 투명 GIS 클릭 영역 */
export function GoogleSignInButton({ disabled, onSuccess, onError }: Props) {
  return (
    <div className={`google-sign-in-host${disabled ? ' is-disabled' : ''}`}>
      <span className="login-btn login-btn--google" aria-hidden="true">
        <GoogleIcon className="login-btn__icon" />
        <span>{DEMO_COPY.ctaGoogle}</span>
      </span>
      <div className="google-sign-in-overlay">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text="signin_with"
          theme="outline"
          size="large"
          shape="rectangular"
          locale="ko"
          width="320"
          containerProps={{ className: 'google-sign-in-gis' }}
        />
      </div>
    </div>
  );
}
