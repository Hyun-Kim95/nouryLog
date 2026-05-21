export const USER_WITHDRAWAL_REASON_CODES = [
  'not_using',
  'alternative_app',
  'hard_to_use',
  'privacy',
  'etc',
] as const;

export type UserWithdrawalReasonCode = (typeof USER_WITHDRAWAL_REASON_CODES)[number];

export const SETTINGS_COPY = {
  withdrawModalTitle: '탈퇴 사유',
  withdrawModalBody: '서비스 개선에 참고해요. 사유를 선택한 뒤 탈퇴를 진행할 수 있어요.',
  withdrawReasonLabel: '탈퇴 사유',
  withdrawReasonRequired: '탈퇴 사유를 선택해 주세요.',
  withdrawEtcLabel: '기타 사유',
  withdrawEtcHelper: '500자 이내',
  withdrawEtcRequired: '기타를 선택했을 때는 사유를 입력해 주세요.',
  withdrawContinue: '탈퇴 진행',
  withdrawCancel: '취소',
  withdrawConfirmTitle: '회원 탈퇴',
  withdrawConfirmBody:
    '탈퇴하면 계정은 즉시 이용할 수 없게 됩니다. 데이터는 비활성화 후 1년이 지나면 완전히 삭제됩니다. 계속할까요?',
  withdrawConfirmAction: '탈퇴',
  withdrawReasonLabels: {
    not_using: '더 이상 이용하지 않음',
    alternative_app: '다른 앱·서비스 이용',
    hard_to_use: '사용이 불편함',
    privacy: '개인정보·데이터 걱정',
    etc: '기타',
  } as Record<UserWithdrawalReasonCode, string>,
} as const;
