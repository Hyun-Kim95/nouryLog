import type { SocialProvider } from '../api';

export type { SocialProvider };

/**
 * SDK 어댑터의 표준 결과 타입.
 * - `success`: provider 가 발급한 토큰(둘 중 최소 하나는 채워짐).
 * - `cancelled`: 사용자가 의도적으로 취소(에러 토스트 대신 info 토스트 처리).
 * - `error`: 기타 실패. message 는 사용자 노출용으로 가공된 한국어 문구.
 */
export type SocialLoginResult =
  | {
      kind: 'success';
      providerAccessToken?: string;
      idToken?: string;
    }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

export interface SocialAdapter {
  readonly provider: SocialProvider;
  login(): Promise<SocialLoginResult>;
  logout(): Promise<void>;
}
