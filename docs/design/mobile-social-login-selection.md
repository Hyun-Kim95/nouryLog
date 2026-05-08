# Mobile SNS Login Design Selection

## 비교표

| 항목 | Option A (Button-first) | Option B (Segmented) |
|---|---|---|
| 첫 SNS 진입 속도 | 빠름 | 보통 |
| 이메일/소셜 구분 명확성 | 보통 | 높음 |
| 상태 UI 확장성(오류/충돌) | 보통 | 높음 |
| 구현 난이도 | 낮음 | 보통 |
| 화면 복잡도 | 높음 | 보통 |

## 선택 결과
- 선택안: **Option B (Segmented)**
- 제외안: Option A

## 선택 사유
1. 이메일/소셜 로그인 경계를 명확히 보여 사용자 혼란을 줄일 수 있다.
2. `ACCOUNT_CONFLICT` 상태를 인라인 카드로 자연스럽게 확장하기 쉽다.
3. 향후 Apple 로그인 등 provider 추가 시 레이아웃 확장성이 더 높다.

## HUMAN 승인 기록
- 사용자 요청(채팅): "네이버/구글/카카오 로그인 구현 계획 Implement the plan as specified"
- 본 요청을 디자인 선택 및 구현 진행 승인으로 간주한다.
