declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Auth: {
        login: (opts: {
          success: (res: { access_token: string }) => void;
          fail: (err: unknown) => void;
        }) => void;
      };
    };
  }
}

const SDK_URL = 'https://t1.kakaocdn.net/kakao/v2/kakao.min.js';

let sdkPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Kakao SDK 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kakao SDK 로드 실패'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function kakaoWebConfigured(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim());
}

export async function loginWithKakaoWeb(): Promise<string> {
  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key) throw new Error('Kakao JavaScript 키가 설정되지 않았습니다.');

  await loadKakaoSdk();
  const Kakao = window.Kakao;
  if (!Kakao) throw new Error('Kakao SDK를 사용할 수 없습니다.');
  if (!Kakao.isInitialized()) Kakao.init(key);

  return new Promise((resolve, reject) => {
    Kakao.Auth.login({
      success: (res) => {
        if (res.access_token) resolve(res.access_token);
        else reject(new Error('카카오 로그인 응답이 비어 있습니다.'));
      },
      fail: (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('cancel')) {
          reject(new Error('카카오 로그인이 취소되었습니다.'));
          return;
        }
        reject(new Error('카카오 로그인에 실패했습니다.'));
      },
    });
  });
}
