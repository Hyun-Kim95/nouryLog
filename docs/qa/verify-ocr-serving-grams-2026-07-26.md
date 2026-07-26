---
type: verify-note
date: 2026-07-26
area: mobile Log / OCR servingGrams
---

# OCR 섭취량(g) 자동 채움 확인

## 자동화
- `apps/server/src/services/nutritionParser.test.ts` — 1회 제공량·serving size·내용량·미검출·범위.

## 수동
| 시나리오 | 기대 |
|---|---|
| 라벨에 `1회 제공량 Ng` 보임 | OCR 후 섭취량(g)=N, 매크로 총량 유지 |
| 제공량(g) 없음·ml만 | 섭취량 빈 칸 + 「제공량을 확인해 주세요」 토스트. 저장 시 grams 필수 차단 |
| 저신뢰도 매크로 | 기존 저신뢰 배너 유지. grams 미검출 토스트는 별도 |

## 회귀
- NF 선택·순수 수기·MealSet OCR 미사용 경로 변경 없음.
