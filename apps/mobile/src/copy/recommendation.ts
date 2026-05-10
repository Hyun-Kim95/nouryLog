/**
 * 권장 계산 v1.4 카피.
 *
 * SSOT: docs/design/recommendation-v14-spec.md v0.1 §3.
 * 본 파일은 카피 8키만 정의한다. 텍스트 변경은 디자인 스펙 §3과 동기화한다.
 */

import type { WarningCode } from '../api/profile';

export const RECOMMENDATION_COPY = {
  estimate:
    '추정 권장값입니다. 질환·임신/수유·청소년 성장기·고령·근감소 우려·전문 운동 목표가 있으면 전문가와 상담하세요.',
  teenCaution: '안내 · 성장기에는 균형 잡힌 식사가 우선이라 자동 감량/증량은 적용하지 않았어요.',
  olderCaution: '안내 · 근감소 예방을 위해 단백질을 보수적으로 올리고 칼로리 변화를 줄였어요.',
  floorApplied: '안내 · 안전 하한이 적용된 칼로리예요. 더 낮추려면 전문가와 상담하세요.',
  medicalGeneric: '안내 · 추정값이며 진단·처방을 대체하지 않아요.',
  versionTag: 'v1.4',
  notifHelper: '추정 권장값 기준으로 알려드려요. 정확한 영양 상담은 전문가에게 문의하세요.',
  onboardingDone: '프로필을 저장했어요. 추정 권장량을 다시 계산했습니다.',
} as const;

/**
 * Phase T — 권장량 사용자 override 카피.
 * SSOT: docs/design/recommendation-override-spec.md v0.1 §3.
 */
export const OVERRIDE_COPY = {
  toggleLabel: '직접 목표 입력',
  toggleHelperOff: '내 목표를 직접 정하고 싶다면 켜세요. 자동 추천 대신 입력값을 저장합니다.',
  toggleHelperOn: '추정 권장값 대신 직접 입력한 목표를 저장합니다.',
  proteinLabel: '단백질 목표',
  proteinHelper: '권장 30~300 g/일. 정수만 입력해 주세요.',
  calorieLabel: '칼로리 목표',
  calorieHelper: '권장 800~6000 kcal/일. 정수만 입력해 주세요.',
  resetButton: '자동 추천으로 되돌리기',
  resetSuccess: '자동 추천으로 되돌렸어요.',
  saveSuccess: '내 목표를 저장했어요.',
} as const;

export const OVERRIDE_PROTEIN_HINT_MIN = 30;
export const OVERRIDE_PROTEIN_HINT_MAX = 300;
export const OVERRIDE_CALORIE_HINT_MIN = 800;
export const OVERRIDE_CALORIE_HINT_MAX = 6000;

export const WARNING_COPY: Record<WarningCode, string> = {
  teen_caution: RECOMMENDATION_COPY.teenCaution,
  older_adult_caution: RECOMMENDATION_COPY.olderCaution,
  low_calorie_floor_applied: RECOMMENDATION_COPY.floorApplied,
  general_medical_caution: RECOMMENDATION_COPY.medicalGeneric,
};

const WARNING_ORDER: WarningCode[] = [
  'teen_caution',
  'older_adult_caution',
  'low_calorie_floor_applied',
  'general_medical_caution',
];

/**
 * UI 표시 순서로 정렬한 warnings 배열을 반환한다(중복 제거).
 * 디자인 스펙 §5 다중 상태 정의: teen → older → floor → generic.
 */
export function sortedWarnings(warnings: WarningCode[] | undefined | null): WarningCode[] {
  if (!warnings || warnings.length === 0) return [];
  const set = new Set(warnings);
  return WARNING_ORDER.filter((w) => set.has(w));
}
