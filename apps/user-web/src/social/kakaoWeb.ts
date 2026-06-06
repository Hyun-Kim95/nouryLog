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

/** Legacy v1 SDK — `kakao/v2/kakao.min.js`는 CDN 403으로 사용 불가 */
const SDK_URLS = [
  'https://t1.kakaocdn.net/kakao_js_sdk/v1/kakao.min.js',
  'https://t1.kakaocdn.net/kakao_js_sdk/v1/kakao.js',
] as const;

let sdkPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  if (window.Kakao) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.Kakao) {
        resolve();
        return;
      }
      if (existing.dataset.kakaoLoaded === 'ok') {
        window.Kakao ? resolve() : reject(new Error('Kakao SDK를 사용할 수 없습니다.'));
        return;
      }
      if (existing.dataset.kakaoLoaded === 'error') {
        reject(new Error('Kakao SDK 로드 실패'));
        return;
      }
      existing.addEventListener(
        'load',
        () => {
          existing.dataset.kakaoLoaded = window.Kakao ? 'ok' : 'error';
          window.Kakao ? resolve() : reject(new Error('Kakao SDK를 사용할 수 없습니다.'));
        },
        { once: true },
      );
      existing.addEventListener(
        'error',
        () => {
          existing.dataset.kakaoLoaded = 'error';
          reject(new Error('Kakao SDK 로드 실패'));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      script.dataset.kakaoLoaded = window.Kakao ? 'ok' : 'error';
      if (window.Kakao) resolve();
      else reject(new Error('Kakao SDK를 사용할 수 없습니다.'));
    };
    script.onerror = () => {
      script.dataset.kakaoLoaded = 'error';
      reject(new Error('Kakao SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });
}

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    let lastError: Error | undefined;
    for (const url of SDK_URLS) {
      try {
        await loadScript(url);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastError ?? new Error('Kakao SDK 로드 실패');
  })();

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
