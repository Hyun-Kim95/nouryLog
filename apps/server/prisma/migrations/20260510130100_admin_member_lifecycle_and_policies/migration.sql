-- 회원 라이프사이클 컬럼: 마지막 로그인 시각.
-- IF NOT EXISTS: 이전 빌드가 동일 컬럼을 자동 추가했을 가능성에 대비.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- 정책 문서: 이용약관 / 개인정보처리방침 단일 본문 저장.
CREATE TABLE IF NOT EXISTS "PolicyDocument" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PolicyDocument_kind_key" ON "PolicyDocument"("kind");
