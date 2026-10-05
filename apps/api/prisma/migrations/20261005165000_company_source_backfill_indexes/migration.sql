-- Backfill: every existing Company row was imported from Sirene.
UPDATE "Company" SET "source" = 'SIRENE_INSEE' WHERE "source" IS NULL;
UPDATE "Company" SET "lastSyncedAt" = "createdAt" WHERE "lastSyncedAt" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "source" SET DEFAULT 'SIRENE_INSEE';
ALTER TABLE "Company" ALTER COLUMN "source" SET NOT NULL;
ALTER TABLE "Company" ALTER COLUMN "lastSyncedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Company" ALTER COLUMN "lastSyncedAt" SET NOT NULL;

CREATE INDEX "Company_city_idx" ON "Company"("city");
CREATE INDEX "Company_activityCode_idx" ON "Company"("activityCode");
CREATE INDEX "Company_companyType_idx" ON "Company"("companyType");
