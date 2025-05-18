/*
 Navicat PostgreSQL Data Transfer

 Source Server         : [local] TestBed
 Source Server Type    : PostgreSQL
 Source Server Version : 140017
 Source Host           : localhost:5432
 Source Catalog        : kitcheneats
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 140017
 File Encoding         : 65001

 Date: 17/05/2025 20:01:30
*/


-- ----------------------------
-- Table structure for aggregates
-- ----------------------------
DROP TABLE IF EXISTS "public"."aggregates";
CREATE TABLE "public"."aggregates" (
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
ALTER TABLE "public"."aggregates" OWNER TO "postgres";

-- ----------------------------
-- Table structure for commands
-- ----------------------------
DROP TABLE IF EXISTS "public"."commands";
CREATE TABLE "public"."commands" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6),
  "status" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'pending'::text,
  "metadata" jsonb
)
;
ALTER TABLE "public"."commands" OWNER TO "postgres";

-- ----------------------------
-- Table structure for events
-- ----------------------------
DROP TABLE IF EXISTS "public"."events";
CREATE TABLE "public"."events" (
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
ALTER TABLE "public"."events" OWNER TO "postgres";

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS "public"."migrations";
CREATE TABLE "public"."migrations" (
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "executed_at" timestamp(6) NOT NULL
)
;
ALTER TABLE "public"."migrations" OWNER TO "postgres";

-- ----------------------------
-- Table structure for profiles
-- ----------------------------
DROP TABLE IF EXISTS "public"."profiles";
CREATE TABLE "public"."profiles" (
  "user_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "role" text COLLATE "pg_catalog"."default" DEFAULT 'member'::text
)
;
ALTER TABLE "public"."profiles" OWNER TO "postgres";

-- ----------------------------
-- Table structure for system_status
-- ----------------------------
DROP TABLE IF EXISTS "public"."system_status";
CREATE TABLE "public"."system_status" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "testerId" uuid NOT NULL,
  "testName" text COLLATE "pg_catalog"."default",
  "result" text COLLATE "pg_catalog"."default",
  "executedAt" timestamp(6),
  "parameters" jsonb,
  "numberExecutedTests" int4,
  "updated_at" timestamp(6)
)
;
ALTER TABLE "public"."system_status" OWNER TO "postgres";

-- ----------------------------
-- Table structure for tenants
-- ----------------------------
DROP TABLE IF EXISTS "public"."tenants";
CREATE TABLE "public"."tenants" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."tenants" OWNER TO "postgres";

-- ----------------------------
-- Primary Key structure for table aggregates
-- ----------------------------
ALTER TABLE "public"."aggregates" ADD CONSTRAINT "aggregates_pkey" PRIMARY KEY ("id", "tenant_id");

-- ----------------------------
-- Primary Key structure for table commands
-- ----------------------------
ALTER TABLE "public"."commands" ADD CONSTRAINT "commands_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table events
-- ----------------------------
ALTER TABLE "public"."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table migrations
-- ----------------------------
ALTER TABLE "public"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("name");

-- ----------------------------
-- Indexes structure for table profiles
-- ----------------------------
CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table profiles
-- ----------------------------
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");

-- ----------------------------
-- Primary Key structure for table system_status
-- ----------------------------
ALTER TABLE "public"."system_status" ADD CONSTRAINT "system_status_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table tenants
-- ----------------------------
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table profiles
-- ----------------------------
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
