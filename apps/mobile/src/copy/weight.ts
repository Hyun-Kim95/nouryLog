export const WEIGHT_COPY = {
  modalTitle: '주간 체중 기록',
  modalBody: '체중을 반영해 목표 칼로리·단백질을 다시 계산해요. 통계의 과거 달성률은 기록 당시 목표를 기준으로 유지됩니다.',
  lastRecorded: (kg: number, days: number) => `마지막 기록 ${kg}kg · ${days}일 전`,
  fieldLabel: '현재 체중',
  fieldHelper: '20~300kg, 소수 1자리까지',
  save: '저장하고 목표 갱신',
  later: '나중에',
  invalidWeight: '체중은 숫자(소수 1자리까지)만 입력해 주세요.',
  weightRange: '체중은 20~300kg 범위로 입력해 주세요.',
  saveError: '체중을 저장하지 못했어요. 다시 시도해 주세요.',
  toastSaved: (weightKg: number, calBefore: number | null, calAfter: number | null, protBefore: number | null, protAfter: number | null) => {
    const cal =
      calBefore != null && calAfter != null ? `칼로리 ${calBefore}→${calAfter} kcal` : '칼로리 목표 갱신';
    const prot =
      protBefore != null && protAfter != null ? `단백질 ${protBefore}→${protAfter}g` : '단백질 목표 갱신';
    return `체중 ${weightKg}kg 저장 · ${cal} · ${prot}`;
  },
} as const;
