-- Additive only: create process+machine cable catalog tables if missing.
-- Does NOT drop or truncate anything (P&L safe).

CREATE TABLE IF NOT EXISTS "ProcessMachineCableType" (
    "id" TEXT NOT NULL,
    "processMachineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcessMachineCableType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProcessMachineCableSize" (
    "id" TEXT NOT NULL,
    "cableTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcessMachineCableSize_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProcessMachineCableType_processMachineId_isActive_sortOrder_idx"
  ON "ProcessMachineCableType"("processMachineId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessMachineCableType_processMachineId_name_key"
  ON "ProcessMachineCableType"("processMachineId", "name");

CREATE INDEX IF NOT EXISTS "ProcessMachineCableSize_cableTypeId_isActive_sortOrder_idx"
  ON "ProcessMachineCableSize"("cableTypeId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessMachineCableSize_cableTypeId_name_key"
  ON "ProcessMachineCableSize"("cableTypeId", "name");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcessMachineCableType_processMachineId_fkey'
  ) THEN
    ALTER TABLE "ProcessMachineCableType"
      ADD CONSTRAINT "ProcessMachineCableType_processMachineId_fkey"
      FOREIGN KEY ("processMachineId") REFERENCES "ProductionProcessMachine"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProcessMachineCableSize_cableTypeId_fkey'
  ) THEN
    ALTER TABLE "ProcessMachineCableSize"
      ADD CONSTRAINT "ProcessMachineCableSize_cableTypeId_fkey"
      FOREIGN KEY ("cableTypeId") REFERENCES "ProcessMachineCableType"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
