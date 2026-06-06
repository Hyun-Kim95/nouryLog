import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { DEMO_COPY } from '../../copy/demo';

type Props = {
  disabled?: boolean;
  onSuccess: (cred: CredentialResponse) => void;
  onError: () => void;
};

/** 카카오·네이버와 동일한 폭/높이. GIS 개인화 버튼 대신 커스텀 라벨을 보여준다. */
export function GoogleSignInButton({ disabled, onSuccess, onError }: Props) {
  return (
    <div className={`google-sign-in-host${disabled ? ' is-disabled' : ''}`}>
      <span className="btn btn-google" aria-hidden="true">
        {DEMO_COPY.ctaGoogle}
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
