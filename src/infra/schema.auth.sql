/*
 Navicat PostgreSQL Data Transfer

 Source Server         : [local] TestBed
 Source Server Type    : PostgreSQL
 Source Server Version : 140017
 Source Host           : localhost:5432
 Source Catalog        : kitcheneats
 Source Schema         : auth

 Target Server Type    : PostgreSQL
 Target Server Version : 140017
 File Encoding         : 65001

 Date: 17/05/2025 20:01:14
*/


-- ----------------------------
-- Sequence structure for refresh_tokens_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "auth"."refresh_tokens_id_seq";
CREATE SEQUENCE "auth"."refresh_tokens_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Table structure for audit_log_entries
-- ----------------------------
DROP TABLE IF EXISTS "auth"."audit_log_entries";
CREATE TABLE "auth"."audit_log_entries" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "payload" json,
  "created_at" timestamptz(6),
  "ip_address" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying
)
;
ALTER TABLE "auth"."audit_log_entries" OWNER TO "postgres";
COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "auth"."users";
CREATE TABLE "auth"."users" (
  "instance_id" uuid,
  "id" uuid NOT NULL,
  "aud" varchar(255) COLLATE "pg_catalog"."default",
  "role" varchar(255) COLLATE "pg_catalog"."default",
  "email" varchar(255) COLLATE "pg_catalog"."default",
  "encrypted_password" varchar(255) COLLATE "pg_catalog"."default",
  "email_confirmed_at" timestamptz(6),
  "invited_at" timestamptz(6),
  "confirmation_token" varchar(255) COLLATE "pg_catalog"."default",
  "confirmation_sent_at" timestamptz(6),
  "recovery_token" varchar(255) COLLATE "pg_catalog"."default",
  "recovery_sent_at" timestamptz(6),
  "email_change_token_new" varchar(255) COLLATE "pg_catalog"."default",
  "email_change" varchar(255) COLLATE "pg_catalog"."default",
  "email_change_sent_at" timestamptz(6),
  "last_sign_in_at" timestamptz(6),
  "raw_app_meta_data" jsonb,
  "raw_user_meta_data" jsonb,
  "is_super_admin" bool,
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6),
  "phone" text COLLATE "pg_catalog"."default" DEFAULT NULL::character varying,
  "phone_confirmed_at" timestamptz(6),
  "phone_change" text COLLATE "pg_catalog"."default" DEFAULT ''::character varying,
  "phone_change_token" varchar(255) COLLATE "pg_catalog"."default" DEFAULT ''::character varying,
  "phone_change_sent_at" timestamptz(6),
  "confirmed_at" timestamptz(6),
  "email_change_token_current" varchar(255) COLLATE "pg_catalog"."default" DEFAULT ''::character varying,
  "email_change_confirm_status" int2 DEFAULT 0,
  "banned_until" timestamptz(6),
  "reauthentication_token" varchar(255) COLLATE "pg_catalog"."default" DEFAULT ''::character varying,
  "reauthentication_sent_at" timestamptz(6),
  "is_sso_user" bool NOT NULL DEFAULT false,
  "deleted_at" timestamptz(6),
  "is_anonymous" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "auth"."users" OWNER TO "postgres";
COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';
COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"auth"."refresh_tokens_id_seq"', 2, false);

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING btree (
  "confirmation_token" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE confirmation_token::text !~ '^[0-9 ]*$'::text;
CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING btree (
  "email_change_token_current" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE email_change_token_current::text !~ '^[0-9 ]*$'::text;
CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING btree (
  "email_change_token_new" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE email_change_token_new::text !~ '^[0-9 ]*$'::text;
CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING btree (
  "reauthentication_token" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE reauthentication_token::text !~ '^[0-9 ]*$'::text;
CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING btree (
  "recovery_token" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE recovery_token::text !~ '^[0-9 ]*$'::text;
CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE is_sso_user = false;
COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';
CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING btree (
  "instance_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  lower(email::text) COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING btree (
  "instance_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING btree (
  "is_anonymous" "pg_catalog"."bool_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table users
-- ----------------------------
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");

-- ----------------------------
-- Checks structure for table users
-- ----------------------------
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_email_change_confirm_status_check" CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2);

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
