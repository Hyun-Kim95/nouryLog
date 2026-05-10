-- 회원 비활성화 사유: 사전정의 코드 + 자유 입력. 둘 다 NULL 허용.
ALTER TABLE "User" ADD COLUMN "deactivationReasonCode" TEXT;
ALTER TABLE "User" ADD COLUMN "deactivationReason" TEXT;

-- 공지: 상단 고정 + 게시기간(둘 다 선택). 정렬은 pinned desc, createdAt desc로 라우트에서 처리.
ALTER TABLE "Notice" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notice" ADD COLUMN "publishStart" TIMESTAMP(3);
ALTER TABLE "Notice" ADD COLUMN "publishEnd" TIMESTAMP(3);
