import { DISCLAIMER } from './aiTemplateAnswer.js';

export const UNKNOWN_ASK_EXAMPLES =
  '"이번 주 단백질 섭취 어때?", "단백질 권장량이란?", "예전에 먹었던 닭가슴살 비슷한 식사 찾아줘"';

export const UNKNOWN_ASK_ANSWER =
  `식단·영양·내 기록과 관련된 질문만 답할 수 있어요. 예: ${UNKNOWN_ASK_EXAMPLES} ${DISCLAIMER}`;
