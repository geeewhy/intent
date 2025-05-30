-- default privileges for public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO PUBLIC;

-- REVOKE SELECT ON TABLE IF EXISTS public.tenants  FROM PUBLIC;
-- REVOKE SELECT ON TABLE IF EXISTS public.profiles FROM PUBLIC;

-- ----------------------------
-- Table structure for aggregates
-- ----------------------------
DROP TABLE IF EXISTS "infra"."aggregates";
CREATE TABLE "infra"."aggregates" (
  "tenant_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "snapshot" jsonb NOT NULL,
  "version" int4 NOT NULL,
  "updated_at" timestamptz(6) DEFAULT now(),
  "created_at" timestamptz(6),
  "schema_version" int2 NOT NULL DEFAULT 1
)
;
ALTER TABLE "infra"."aggregates" OWNER TO "postgres";

-- ----------------------------
-- Table structure for commands
-- ----------------------------
DROP TABLE IF EXISTS "infra"."commands";
CREATE TABLE "infra"."commands" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6),
  "status" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'pending'::text,
  "metadata" jsonb,
  "result" jsonb
)
;
ALTER TABLE "infra"."commands" OWNER TO "postgres";

-- ----------------------------
-- Table structure for events
-- ----------------------------
DROP TABLE IF EXISTS "infra"."events";
CREATE TABLE "infra"."events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "aggregate_id" uuid,
  "aggregate_type" text COLLATE "pg_catalog"."default",
  "version" int4,
  "metadata" jsonb
)
;
ALTER TABLE "infra"."events" OWNER TO "postgres";

--MATERIAL VIEW FOR METADATA
CREATE VIEW infra.event_metadata AS
SELECT
    id,
    aggregate_id,
    aggregate_type,
    tenant_id,
    type,
    metadata->>'causationId' AS causation_id,
        metadata->>'correlationId' AS correlation_id,
        metadata->>'schemaVersion' AS schema_version,
        created_at
        FROM infra.events;

-- ----------------------------
-- Primary Key structure for table aggregates
-- ----------------------------
ALTER TABLE "infra"."aggregates" ADD CONSTRAINT "aggregates_pkey" PRIMARY KEY ("id", "tenant_id");

-- ----------------------------
-- Primary Key structure for table commands
-- ----------------------------
ALTER TABLE "infra"."commands" ADD CONSTRAINT "commands_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table events
-- ----------------------------
ALTER TABLE "infra"."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");
