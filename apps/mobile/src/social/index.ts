import type { SocialProvider } from '../api';
import { naverAdapter } from './naver';
import { kakaoAdapter } from './kakao';
import { googleAdapter } from './google';
import type { SocialAdapter } from './types';

export type { SocialAdapter, SocialLoginResult, SocialProvider } from './types';

const adapters: Record<SocialProvider, SocialAdapter> = {
  naver: naverAdapter,
  kakao: kakaoAdapter,
  google: googleAdapter,
};

const providers: SocialProvider[] = ['naver', 'kakao', 'google'];

export function socialAdapter(provider: SocialProvider): SocialAdapter {
  return adapters[provider];
}

/** 로그아웃·세션 만료 시 SNS SDK 잔여 세션을 정리한다. */
export async function signOutAllSocialProviders(): Promise<void> {
  await Promise.all(
    providers.map(async (provider) => {
      try {
        await adapters[provider].logout();
      } catch (e) {
        console.warn('[social]', 'logout_failed', { provider, err: e });
      }
    }),
  );
}
