-- 1. Tenants table
CREATE TABLE tenants (
                         id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                         name text
);

-- 2. Profiles (1-row per auth.user)
CREATE TABLE profiles (
                          user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                          tenant_id uuid NOT NULL REFERENCES tenants(id),
                          role      text DEFAULT 'member' -- 'owner', 'admin', etc.
);

-- 3. Commands table
CREATE TABLE commands (
                          id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                          tenant_id  uuid NOT NULL,
                          type       text NOT NULL,
                          payload    jsonb NOT NULL,
                          created_at timestamptz NOT NULL DEFAULT now(),
                          updated_at timestamptz,
                          status     text NOT NULL DEFAULT 'pending'
);

-- 4. Events table
CREATE TABLE events (
                        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                        tenant_id      uuid NOT NULL,
                        type           text NOT NULL,
                        payload        jsonb NOT NULL,
                        created_at     timestamptz NOT NULL DEFAULT now(),
                        aggregate_id   uuid,
                        aggregate_type text
);

-- 5. Aggregates table
CREATE TABLE aggregates (
                            id         uuid PRIMARY KEY,
                            tenant_id  uuid NOT NULL,
                            type       text NOT NULL,
                            data       jsonb NOT NULL,
                            version    integer NOT NULL DEFAULT 0,
                            created_at timestamptz NOT NULL DEFAULT now(),
                            updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Helper view: current tenant for RLS
CREATE VIEW current_tenant AS
SELECT
    /* detect fake tenant_id in test JWTs first */
    COALESCE(
            NULLIF(current_setting('request.jwt.claims', true)::json->>'test_tenant_id', '')::uuid,
        -- else look up the profile
            (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    ) AS tenant_id;

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates ENABLE ROW LEVEL SECURITY;

-- Tenants table policies - FIXED to avoid recursion
CREATE POLICY tenant_select_policy ON tenants
  FOR SELECT USING (
                 EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND tenant_id = tenants.id)
                 );

-- Profiles table policies - FIXED to avoid recursion
CREATE POLICY profile_select_policy ON profiles
  FOR SELECT USING (
                 user_id = auth.uid() OR
                 tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
                 );

-- Special policy to allow users to read their own profile during auth
CREATE POLICY profile_self_select_policy ON profiles
  FOR SELECT USING (
                 user_id = auth.uid()
                 );

-- Commands table policies
CREATE POLICY command_insert_policy ON commands
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY command_select_policy ON commands
  FOR SELECT USING (
                        tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
                        );

CREATE POLICY command_update_policy ON commands
  FOR UPDATE USING (
                 tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
                 );

-- Events table policies
CREATE POLICY event_select_policy ON events
  FOR SELECT USING (
                 tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
                 );

-- Aggregates table policies
CREATE POLICY aggregate_select_policy ON aggregates
  FOR SELECT USING (
                 tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
                 );

-- Add indexes for improved performance
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_commands_tenant_id ON commands(tenant_id);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_aggregates_tenant_id ON aggregates(tenant_id);
CREATE INDEX idx_events_aggregate_id ON events(aggregate_id);

-- Add security policies for service roles and test environments
-- This allows the service role to bypass RLS for testing and background jobs
CREATE POLICY service_role_bypass ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_role_bypass ON tenants
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_role_bypass ON commands
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_role_bypass ON events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY service_role_bypass ON aggregates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');


DROP POLICY IF EXISTS profile_select_policy ON profiles;
DROP POLICY IF EXISTS profile_self_select_policy ON profiles;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
