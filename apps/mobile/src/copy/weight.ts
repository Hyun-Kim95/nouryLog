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
  sectionTitle: '체중',
  historyTitle: '체중 기록',
  historyEmpty: '아직 체중 기록이 없어요.',
  historyRecord: '체중 기록',
  historyLoadError: '체중 기록을 불러오지 못했어요.',
  historyRetry: '다시 시도',
  referenceLoadError: '참고 체중 구간을 불러오지 못했어요.',
  historyEntryLine: (dateLabel: string, weightKg: number) => `${dateLabel} · ${weightKg}kg`,
  chartTitle: '체중 추이 (최근 90일)',
  chartTapHint: '점을 탭하면 해당 날짜 체중이 표시돼요.',
  chartBandLegend: '음영·점선 구간: 키·BMI(18.5~23) 기준 참고 체중 범위입니다.',
  chartTooltip: (dateLabel: string, weightKg: number) => `${dateLabel} · ${weightKg}kg`,
  referenceTitle: '참고 체중 구간',
  referenceRange: (minKg: number, maxKg: number, bmiMin: number, bmiMax: number) =>
    `${minKg}~${maxKg}kg (BMI ${bmiMin}~${bmiMax})`,
  referenceCurrent: (weightKg: number, bmi: number) => `현재 ${weightKg}kg · BMI ${bmi}`,
  hintLose: '현재 체중이 참고 구간보다 높아요. 감량을 고려해 볼 수 있어요.',
  hintMaintain: '참고 구간 안에 있어요. 유지를 고려해 볼 수 있어요.',
  hintGain: '현재 체중이 참고 구간보다 낮아요. 증량을 고려해 볼 수 있어요.',
  hintTeen: '성장기에는 균형 잡힌 식사가 우선이에요. 목표는 신중히 선택해 주세요.',
  toastSaved: (weightKg: number, calBefore: number | null, calAfter: number | null, protBefore: number | null, protAfter: number | null) => {
    const cal =
      calBefore != null && calAfter != null ? `칼로리 ${calBefore}→${calAfter} kcal` : '칼로리 목표 갱신';
    const prot =
      protBefore != null && protAfter != null ? `단백질 ${protBefore}→${protAfter}g` : '단백질 목표 갱신';
    return `체중 ${weightKg}kg 저장 · ${cal} · ${prot}`;
  },
} as const;
