-- Add deactivatedAt to soft-delete entities (User already has it).
ALTER TABLE "Meal" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "FoodTemplate" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "Inquiry" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "Notice" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- Backfill existing inactive rows (use createdAt as conservative estimate).
UPDATE "Meal" SET "deactivatedAt" = "createdAt" WHERE "active" = false AND "deactivatedAt" IS NULL;
UPDATE "FoodTemplate" SET "deactivatedAt" = "createdAt" WHERE "active" = false AND "deactivatedAt" IS NULL;
UPDATE "Inquiry" SET "deactivatedAt" = "createdAt" WHERE "active" = false AND "deactivatedAt" IS NULL;
UPDATE "Notice" SET "deactivatedAt" = "createdAt" WHERE "active" = false AND "deactivatedAt" IS NULL;
