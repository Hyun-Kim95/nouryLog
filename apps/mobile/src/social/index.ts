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

export function socialAdapter(provider: SocialProvider): SocialAdapter {
  return adapters[provider];
}
