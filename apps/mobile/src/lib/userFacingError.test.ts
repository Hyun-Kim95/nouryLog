import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ERRORS_COPY } from '../copy/errors';
import { ApiError } from './apiError';
import { isUserSafeMessage, toUserMessage } from './userFacingError';

class TestProfileApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly field: string | null;

  constructor(status: number, body: { code?: string; message?: string; details?: { field?: string } | null }) {
    super(body.message || `HTTP ${status}`);
    this.name = 'ProfileApiError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.field = body.details?.field ?? null;
  }
}

describe('userFacingError', () => {
  it('isUserSafeMessage accepts Korean validation copy', () => {
    assert.equal(isUserSafeMessage('이름을 입력해 주세요.'), true);
    assert.equal(isUserSafeMessage('결제가 취소되었습니다.'), true);
  });

  it('isUserSafeMessage rejects technical messages', () => {
    assert.equal(isUserSafeMessage('Network request failed'), false);
    assert.equal(isUserSafeMessage('Call to function ExponentImagePicker.launchImageLibraryAsync rejected'), false);
    assert.equal(isUserSafeMessage('Railway의 OCR_API_KEY가 올바르지 않습니다.'), false);
  });

  it('toUserMessage maps network failures', () => {
    const msg = toUserMessage(new Error('Network request failed'), { context: 'generic' });
    assert.equal(msg, ERRORS_COPY.network);
  });

  it('toUserMessage maps native image picker errors to ocr fallback', () => {
    const msg = toUserMessage(
      new Error('Call to function ExponentImagePicker.launchImageLibraryAsync has been rejected.'),
      { context: 'ocr' },
    );
    assert.equal(msg, ERRORS_COPY.ocr);
  });

  it('toUserMessage ignores operator OCR server text via ApiError code', () => {
    const err = new ApiError(503, {
      code: 'OCR_PROVIDER_UNAVAILABLE',
      message: 'Railway의 OCR_API_KEY가 로컬 .env와 동일한지 확인해 주세요.',
    });
    const msg = toUserMessage(err, { context: 'ocr' });
    assert.equal(msg, ERRORS_COPY.ocrUnavailable);
  });

  it('toUserMessage preserves ProfileApiError 422 field messages', () => {
    const err = new TestProfileApiError(422, {
      code: 'VALIDATION_FAILED',
      message: '나이는 14세 이상이어야 합니다.',
      details: { field: 'age' },
    });
    const msg = toUserMessage(err, { context: 'profile' });
    assert.equal(msg, '나이는 14세 이상이어야 합니다.');
  });

  it('toUserMessage preserves intentional Korean app errors', () => {
    const msg = toUserMessage(new Error('로그인 필요'), { context: 'meal' });
    assert.equal(msg, '로그인 필요');
  });
});
