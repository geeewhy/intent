DROP TABLE IF EXISTS system_status;

CREATE TABLE system_status (
   id UUID PRIMARY KEY,
   tenant_id UUID NOT NULL,
   "testerId" UUID NOT NULL,
   "testName" TEXT,
   result TEXT,
   "executedAt" TIMESTAMP,
   parameters JSONB,
   "numberExecutedTests" INTEGER,
   updated_at TIMESTAMP
);

