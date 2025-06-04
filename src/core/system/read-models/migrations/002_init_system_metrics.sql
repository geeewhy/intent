DROP TABLE IF EXISTS system_metrics;

CREATE TABLE system_metrics (
   id UUID PRIMARY KEY,
   tenant_id UUID NOT NULL,
   "testCount" INTEGER,
   updated_at TIMESTAMP,
   last_event_id UUID NOT NULL,
   last_event_version INTEGER NOT NULL
);
