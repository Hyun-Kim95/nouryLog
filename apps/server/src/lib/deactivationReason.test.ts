import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAdminDeactivationReason,
  validateUserWithdrawalReason,
} from './deactivationReason.js';

test('validateUserWithdrawalReason requires code', () => {
  const r = validateUserWithdrawalReason({});
  assert.equal(r.ok, false);
});

test('validateUserWithdrawalReason accepts preset without text', () => {
  const r = validateUserWithdrawalReason({ reasonCode: 'not_using' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.reasonCode, 'not_using');
    assert.equal(r.reasonText, null);
  }
});

test('validateUserWithdrawalReason requires text for etc', () => {
  const r = validateUserWithdrawalReason({ reasonCode: 'etc' });
  assert.equal(r.ok, false);
  const ok = validateUserWithdrawalReason({ reasonCode: 'etc', reasonText: '  기타 사유  ' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.reasonText, '기타 사유');
});

test('validateAdminDeactivationReason unchanged semantics', () => {
  const r = validateAdminDeactivationReason({ reasonCode: 'spam' });
  assert.equal(r.ok, true);
  const bad = validateAdminDeactivationReason({ reasonCode: 'not_using' });
  assert.equal(bad.ok, false);
});
