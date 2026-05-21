export const ADMIN_DEACTIVATION_REASON_CODES = ['spam', 'inactive_long', 'terms_violation', 'etc'] as const;
export type AdminDeactivationReasonCode = (typeof ADMIN_DEACTIVATION_REASON_CODES)[number];

export const USER_WITHDRAWAL_REASON_CODES = [
  'not_using',
  'alternative_app',
  'hard_to_use',
  'privacy',
  'etc',
] as const;
export type UserWithdrawalReasonCode = (typeof USER_WITHDRAWAL_REASON_CODES)[number];

export const DEACTIVATION_REASON_TEXT_MAX = 500;

export function isAdminDeactivationReasonCode(v: unknown): v is AdminDeactivationReasonCode {
  return typeof v === 'string' && (ADMIN_DEACTIVATION_REASON_CODES as readonly string[]).includes(v);
}

export function isUserWithdrawalReasonCode(v: unknown): v is UserWithdrawalReasonCode {
  return typeof v === 'string' && (USER_WITHDRAWAL_REASON_CODES as readonly string[]).includes(v);
}

export type DeactivationReasonValidation =
  | { ok: true; reasonCode: string; reasonText: string | null }
  | { ok: false; message: string; field?: string };

function parseReasonText(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function validateAdminDeactivationReason(body: {
  reasonCode?: unknown;
  reasonText?: unknown;
}): DeactivationReasonValidation {
  const reasonCode = body.reasonCode;
  if (!isAdminDeactivationReasonCode(reasonCode)) {
    return {
      ok: false,
      message: `reasonCode는 ${ADMIN_DEACTIVATION_REASON_CODES.join(' | ')} 중 하나여야 합니다.`,
      field: 'reasonCode',
    };
  }
  const reasonText = parseReasonText(body.reasonText);
  if (reasonCode === 'etc' && !reasonText) {
    return {
      ok: false,
      message: "reasonCode가 'etc'일 때는 reasonText가 필요합니다.",
      field: 'reasonText',
    };
  }
  if (reasonText.length > DEACTIVATION_REASON_TEXT_MAX) {
    return {
      ok: false,
      message: `reasonText는 ${DEACTIVATION_REASON_TEXT_MAX}자 이하여야 합니다.`,
      field: 'reasonText',
    };
  }
  return { ok: true, reasonCode, reasonText: reasonText || null };
}

export function validateUserWithdrawalReason(body: {
  reasonCode?: unknown;
  reasonText?: unknown;
}): DeactivationReasonValidation {
  const reasonCode = body.reasonCode;
  if (!isUserWithdrawalReasonCode(reasonCode)) {
    return {
      ok: false,
      message: `reasonCode는 ${USER_WITHDRAWAL_REASON_CODES.join(' | ')} 중 하나여야 합니다.`,
      field: 'reasonCode',
    };
  }
  const reasonText = parseReasonText(body.reasonText);
  if (reasonCode === 'etc' && !reasonText) {
    return {
      ok: false,
      message: "reasonCode가 'etc'일 때는 탈퇴 사유를 입력해 주세요.",
      field: 'reasonText',
    };
  }
  if (reasonText.length > DEACTIVATION_REASON_TEXT_MAX) {
    return {
      ok: false,
      message: `사유는 ${DEACTIVATION_REASON_TEXT_MAX}자 이하여야 합니다.`,
      field: 'reasonText',
    };
  }
  return { ok: true, reasonCode, reasonText: reasonText || null };
}
