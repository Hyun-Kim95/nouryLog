---
type: spec
project: dietManagement
doc_lane: requirements
updated_at: 2026-07-21
tags: [state, error-handling, ui, fixed, nutrition-food]
---

# 식단 관리 상태/에러 처리 매핑 v1 (고정)

> Stitch 선택안 기준 Gate 2 입력으로 고정한다. 상태 모델은 `기본/로딩/빈/오류/완료/권한 제한`을 표준으로 사용한다.
> NutritionFood(§6): 2026-07-19 API 증분 · 2026-07-21 모바일 autofill 1차 예외(빈 q) 교차 표기.

## 1) 공통 상태
- 기본
- 로딩
- 빈 데이터
- 오류
- 완료
- 권한 제한

## 2) 앱 화면 매핑

### 식사 기록 입력 화면
- 기본: 수동 입력 또는 OCR 결과 대기
- 로딩: OCR 요청/저장 요청 진행
- 오류: 입력 검증 실패, 서버 오류, 네트워크 오류
- 완료: 저장 성공 토스트 + 기록 상세 이동
- 권한 제한: 로그인 만료 시 재인증 유도

엣지케이스:
- OCR 일부 필드 누락 -> 누락 필드만 수동 입력 유도
- 중복 저장 탭 연타 -> 버튼 비활성 + idempotency 처리

### 통계 화면
- 기본: 마지막 배치 결과 표시
- 로딩: 기간 변경 또는 새 조회
- 빈 데이터: 기록 없음 + 기록 추가 CTA
- 오류: 조회 실패 + 재시도
- 완료: 합계/달성률 표시

엣지케이스:
- `isStale=true` -> "최신 반영 지연" 배너 노출
- 타임존 변경 직후 -> 집계 기준 타임존 표시

### 결제/구독 화면
- 기본: 현재 플랜(무료/프리미엄), 남은 무료 OCR 횟수 표시
- 로딩: entitlement/결제 상태 조회
- 오류: 결제 서버 오류 또는 복구 실패 안내 + 재시도
- 완료: 결제 성공 후 OCR 유료권 + 광고 제거 상태 반영

엣지케이스:
- OCR 4회 사용 시 사전 안내 배너 노출
- OCR 5회 소진 시 결제 유도 모달 노출
- 결제 복구 시 기존 권한 복원 및 광고 노출 즉시 갱신

## 3) 관리자 화면 매핑

### 목록형 화면(회원/음식/문의/공지)
- 기본: 테이블 + 필터 + 페이지네이션(15개)
- 로딩: 필터/페이지 이동 시 스켈레톤 또는 로더
- 빈 데이터: 검색조건 유지 + 빈 결과 안내
- 오류: 조회 실패 안내 + 재시도
- 권한 제한: 403 접근 불가 안내

엣지케이스:
- 비활성화 직후 캐시 잔존 -> 즉시 목록 재조회/캐시 무효화
- 이미 비활성화 대상 재요청 -> 성공(멱등) 처리

## 4) 에러 코드-UX 매핑
- `AUTH_UNAUTHORIZED` -> 로그인 재진입
- `AUTH_TOKEN_EXPIRED` -> 토큰 재발급 1회 시도 후 실패 시 로그인 재진입
- `AUTH_FORBIDDEN` -> 접근 권한 없음 안내
- `VALIDATION_FAILED` -> 필드 단위 오류 표시
- `OCR_RATE_LIMIT` -> 수동입력 전환 + 잠시 후 재시도 안내
- `OCR_PROVIDER_UNAVAILABLE` -> 수동입력 전환
- `OCR_FREE_QUOTA_EXCEEDED` -> 결제 유도 모달 노출
- `PAYMENT_REQUIRED` -> 결제 화면 이동
- `BILLING_NOT_AVAILABLE` -> 결제 불가 안내 + 나중에 다시 시도
- `STATS_STALE_DATA` -> 지연 안내 배너
- `RESOURCE_CONFLICT` -> 최신 상태 재조회 안내

## 5) 상태 UI 체크포인트
- 아이콘 단독 의미 전달 금지 (텍스트 병기)
- 오류 메시지는 행동 가능한 문구(재시도/수정) 포함
- 모바일/웹 모두 동일 에러코드에 대해 동일 의미 유지
- API 계약 문서(`feature-diet-management-api-contract-v1.md`)의 에러 코드 카탈로그와 불일치가 생기면 상태 문서를 우선 갱신 후 구현 반영

## 6) NutritionFood 검색 API (모바일 autofill 연동)

> API PRD: `feature-nutrition-food-db-prd.md` v0.4 · 계약 v1.17.  
> 모바일 UI PRD: `feature-mobile-nutrition-autofill-prd.md` (v0.3 **approved** 2026-07-21).

| API 상태 | HTTP/조건 | UI 권장 |
|---|---|---|
| 기본 | 200 + items ≥ 1 | 목록 표시(「영양성분 DB(식약처)」 섹션) |
| 로딩 | 요청 중 | 스피너/스켈레톤 |
| 빈 데이터 | 200 + `total=0` (무매칭·카탈로그 공허) | "검색 결과 없음" + 수기 입력 계속 |
| 빈 검색어 목록 | 200 + active 페이지 | API는 허용. **모바일 autofill 1차: q trim≥1일 때만 호출·섹션 표시**(빈 q 브라우징 Out) |
| 오류(검증) | 422 `VALIDATION_FAILED` `field=q` | 검색어 줄이기 안내. 클라는 trim 후 >60이면 **선차단**(동일 의미) |
| 권한 제한 | 401 / 403 | 재로그인 또는 권한 없음 |
| 서버 오류 | 500 | 재시도. suggestions·수기·템플릿 경로는 막지 않음 |

엣지:
- `page`/`size` 이상값 → 서버 clamp(사용자에게 422 안 냄)
- inactive 항목은 일반 사용자 목록에 안 보임(OCR 쿼터와 무관)
- 모바일 1차: page=1·UI 상위 8건·더보기 없음(`feature-mobile-nutrition-autofill-prd.md` §5.3)
