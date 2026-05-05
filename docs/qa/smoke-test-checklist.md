---
type: doc
project: dietManagement
doc_lane: qa
updated_at: 2026-05-06
tags: [smoke, qa-q1, regression]
---

# 스모크 · 회귀 점검 (QA-Q1 요약)

## 자동

- 서버 단위: `npm run test -w @diet-management/server` (`apps/server/src/config.test.ts`)

## 수동 스모크 (로컬)

**전제:** `apps/server`에 `.env` 복사(`.env.example` 참고), `npm run dev:server` 기동.

1. **관리자 웹** (`npm run dev:admin`)
   - 로그인 `admin@example.com` / `admin123`
   - 대시보드 수치 로드, 재집계 버튼 202 응답 후 통계 stale 갱신 가능
   - 회원·음식·문의·공지 목록: 필터·검색 오른쪽 초기화·15행·`<` `>` 페이지네이션
   - 일반 사용자 토큰으로 `/api/admin/*` 호출 시 403 메시지(대시보드 오류 배너)

2. **모바일** (`npm run dev:mobile`, API URL 실제 환경에 맞게 설정)
   - `user@example.com` / `user123` 로그인
   - 홈: entitlements + 광고 상태
   - 기록: 식사 추가 + OCR 스텁 (무료 한도 경계 확인 가능)
   - 통계: `range=day` 요약 및 stale 배너 조건
   - 구독: checkout 스텁 후 홈 entitlement 변화

3. **경계값**
   - OCR 무료 5회 초과 시 서버 402 및 메시지
   - 통계 `aggregatedAt` 대비 `STATS_STALE_HOURS`(기본 6h) 초과 시 `isStale`

## 잔여 리스크 (기록용)

- 리프레시 토큰 클라이언트 라운드트립 미구현
- 관리자 목록 행 액션(비활성화 등) UI 미구현
- 실결제·실 OCR 벤더·이미지 업로드 스토리지는 스텁/후속
