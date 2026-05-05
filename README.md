# nouryLog

식단 기록과 영양 분석을 위한 앱/관리자 웹 통합 프로젝트입니다.

## 프로젝트 구성

- `apps/server`: Express + Prisma(PostgreSQL) API 서버
- `apps/mobile`: Expo(React Native) 모바일 앱
- `apps/admin-web`: Vite + React 관리자 웹
- `packages/api-client`: OpenAPI 기반 타입/클라이언트 패키지

## 핵심 기능

- 음식 기록 생성/조회/수정/비활성화
- OCR 기반 영양성분 인식(실 API 연동)
- 통계 조회(`isStale`, `staleHours` 포함)
- 구독/광고 게이트(기본 정책 반영)
- 관리자 대시보드 및 목록 관리(회원/음식/문의/공지)

## 빠른 실행

```bash
npm install
npm run dev:server
npm run dev:admin
npm run dev:mobile
```

모바일 에뮬레이터 테스트 시 `apps/mobile/.env`의 `EXPO_PUBLIC_API_URL`을 환경에 맞게 사용합니다.

