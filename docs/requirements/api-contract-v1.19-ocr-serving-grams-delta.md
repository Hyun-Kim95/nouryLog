---
type: api-contract
project: dietManagement
status: fixed
updated_at: 2026-07-26
version: v1.19
tags: [requirements, api-contract, ocr, grams-only]
related:
  - docs/requirements/feature-grams-only-transition-prd.md
  - docs/requirements/feature-diet-management-api-contract-v1.md
---

# API 계약 v1.19 — OCR `servingGrams`

PRD: [`feature-grams-only-transition-prd.md`](./feature-grams-only-transition-prd.md) AC-08(개정).

OpenAPI: `contracts/openapi-diet-management-v1.yaml` `OcrResult`.

## 변경: `POST /nutrition/ocr` 응답

### 신규 필드
| 필드 | 타입 | 설명 |
|---|---|---|
| `servingGrams` | `number \| null` | 영양표 1회 제공량(g). 유효 범위 1..5000. 미검출·범위 밖이면 `null` |

- `missingFields`에 `'servingGrams'`가 포함될 수 있다. **매크로 4필드가 하나라도 있으면 OCR 성공**(servingGrams만 없어도 200).
- 매크로는 기존과 동일(총량으로 해석). `servingGrams`로 매크로를 환산하지 않는다.
- 후방 호환: 신규 필드. 구 클라이언트는 무시 가능.

### 소비자
| 클라이언트 | 동작 |
|---|---|
| 모바일 Log | 값이 있으면 섭취량(g) 채움. `null`이면 빈 칸 + 「제공량을 확인해 주세요」 토스트 |
