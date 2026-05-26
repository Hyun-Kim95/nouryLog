ALTER TABLE "Profile"
ADD COLUMN "carbohydrateGoalG" INTEGER,
ADD COLUMN "fatGoalG" INTEGER,
ADD COLUMN "carbohydrateGoalMinG" INTEGER,
ADD COLUMN "carbohydrateGoalMaxG" INTEGER,
ADD COLUMN "fatGoalMinG" INTEGER,
ADD COLUMN "fatGoalMaxG" INTEGER;

ALTER TABLE "WeightEntry"
ADD COLUMN "carbohydrateGoalG" INTEGER,
ADD COLUMN "fatGoalG" INTEGER,
ADD COLUMN "carbohydrateGoalMinG" INTEGER,
ADD COLUMN "carbohydrateGoalMaxG" INTEGER,
ADD COLUMN "fatGoalMinG" INTEGER,
ADD COLUMN "fatGoalMaxG" INTEGER;
