# ADR-002: Supabase + Temporal Auth Layer Addendum

---

## Overview

This add-on specifies the authentication and tenant isolation layer for the Supabase + Temporal stack:

* **User ↔ Tenant (“household”) mapping**
* **RLS rules:** Every SQL/WebSocket request only sees rows for its tenant
* **Testing bypass:** Ability to fake tenant context (for CI) without touching production logic

All other system components remain as previously designed; only auth-related tables, policies, and helpers are new.

---

### 1. Database Additions

```sql
-- 1.1 Tenants (households)
create table households (
  id   uuid primary key default gen_random_uuid(),
  name text
);

-- 1.2 User profiles
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references households(id),
  role         text default 'member' -- 'owner', 'admin', etc.
);

-- 1.3 View for RLS: current tenant context
create or replace view current_tenant as
select
  coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'test_tenant_id', ''),
    (select household_id from profiles where user_id = auth.uid())
  ) as tenant_id;
```

* **RLS picks up a `test_tenant_id` (for tests/CI); otherwise uses the real profile mapping.**

---

### 2. Row-Level Security (RLS)

```sql
-- Enable RLS
alter table events       enable row level security;
alter table aggregates   enable row level security;
alter table commands     enable row level security;
alter table households   enable row level security;
alter table profiles     enable row level security;

-- Policy: only service_role or matching tenant
create policy tenant_only on events
  for all using (
    auth.role() = 'service_role'
    or tenant_id = (select tenant_id from current_tenant)
  );
-- Repeat policy for other tables as needed
```

---

### 3. JWT Custom Claims

**Production:**

* On sign-up, backend creates a `profiles` row linked to `household_id`.
* User’s JWT includes `household_id` via `user_metadata`.

```json
{ "user_metadata": { "household_id": "<UUID>" } }
```

**Testing/CI:**

* Generate JWT with a `test_tenant_id` claim.
* RLS picks this up as the tenant context.

```json
{
  "sub": "test-user",
  "role": "authenticated",
  "test_tenant_id": "any-uuid"
}
```

---

### 4. Edge Function: Command Ingest (with tenant isolation)

```ts
// functions/command.ts
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const admin = createClient(Deno.env.get("SB_URL"), Deno.env.get("SERVICE_KEY"));

serve(async (req) => {
  const jwt = JSON.parse(req.headers.get("x-jwt-payload") ?? "{}");
  const tenant = jwt.test_tenant_id ?? jwt.household_id ?? new Response("No tenant", { status: 403 });
  const cmd = await req.json();

  await admin.from("commands").insert([{ ...cmd, tenant_id: tenant }]);
  return new Response("queued", { status: 202 });
});
```

* In tests, send JWT with `test_tenant_id`.
* In prod, JWT contains `household_id`.

---

### 5. React Client Auth Flow

```ts
import { createClient } from "@supabase/supabase-js";
const sb = createClient(SB_URL, SB_ANON_KEY);

export async function signIn(email, pass) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  const tenantId = data.user.user_metadata.household_id;
  return { session: data.session, tenantId };
}

/* For testing/CI */
export function signInAsTenant(fakeTenantId: string) {
  const jwt = makeFakeJwt({ test_tenant_id: fakeTenantId });
  return { session: { access_token: jwt }, tenantId: fakeTenantId };
}
```

* **Prod:** UI reads tenant ID from real JWTs.
* **Test:** Use `signInAsTenant()` to mint fake JWTs.

---

### 6. Temporal Routing per Tenant

* **Option A:** One Temporal namespace per tenant
* **Option B:** Shared namespace, prefix all workflow/task IDs with tenant

```ts
// Option B (recommended)
namespace : "app",
workflowId: `${cmd.tenant_id}-${cmd.type}-${cmd.id}`,
taskQueue : `tenant-${cmd.tenant_id}`,
```

* Tenant ID always taken from JWT claims (`household_id` in prod, `test_tenant_id` in test).

---

### 7. E2E Testing Recipe

1. Mint fake JWT: `{ "test_tenant_id": "111..." }`
2. Set header `Authorization: Bearer <jwt>`
3. Test flow:

    * Call `/functions/v1/command`
    * Listen on realtime channel `events-111...`
    * Assert event payload matches expected
4. RLS always applies, even for test tokens (no bypass except for `service_role`).

---

### TL;DR

* Add `households` and `profiles` tables for multi-tenancy.
* RLS policy uses a view to detect test-tenant overrides (for CI), else uses true user-household mapping.
* All downstream insert/selects, streams, and workflows are tenant-scoped.
* The domain core never needs to know about authentication, but benefits from strict tenant isolation.
