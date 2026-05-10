-- 기존 dev DB drift 흡수용 마이그레이션.
-- v1.3 권장 계산 단계에서 schema.prisma 에는 추가됐으나 마이그레이션 파일이 없던 컬럼들을
-- 운영 DB에도 적용 가능하도록 IF NOT EXISTS 로 안전하게 추가한다.
-- 이미 dev 환경에서 직접 추가된 경우 무영향.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "activityLevel" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "goal" TEXT;
