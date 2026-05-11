-- 사용자 약관/개인정보처리방침 동의 이력.
-- 정책 개정 시 버전별 이력을 보존하기 위해 별도 테이블로 둔다.
CREATE TABLE IF NOT EXISTS "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserConsent_userId_kind_idx" ON "UserConsent"("userId", "kind");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserConsent_userId_fkey'
  ) THEN
    ALTER TABLE "UserConsent"
      ADD CONSTRAINT "UserConsent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
