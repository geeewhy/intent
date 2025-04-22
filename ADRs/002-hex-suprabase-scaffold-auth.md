Below is the add‑on authentication layer for the Supabase + Temporal proposal, including:

User‑to‑tenant (“household”) mapping

RLS rules that guarantee every SQL/WebSocket request sees only its tenant’s rows

A testing bypass that lets you fake any tenant_id without changing production code

Everything else (events table, snapshots, Temporal pump, React hook) remains as in the previous answer—only auth‑related tables, policies, and helper code are new.

1 DB additions
sql
Copy
Edit
-- 1.1 Tenants (= households)
create table households (
id   uuid primary key default gen_random_uuid(),
name text
);

-- 1.2 Profiles (1‑row per auth.user)
create table profiles (
user_id      uuid  primary key references auth.users(id) on delete cascade,
household_id uuid  not null references households(id),
role         text  default 'member' -- 'owner', 'admin', etc.
);

-- 1.3 Helper view: current tenant for RLS
create or replace view current_tenant as
select
/* detect fake tenant_id in test JWTs first */
coalesce(
nullif(current_setting('request.jwt.claims', true)::json->>'test_tenant_id', ''),
-- else look up the profile
(select household_id from profiles where user_id = auth.uid())
) as tenant_id;
2 Row‑Level Security (RLS)
sql
Copy
Edit
-- apply to every multitenant table
alter table events       enable row level security;
alter table aggregates   enable row level security;
alter table commands     enable row level security;
alter table households   enable row level security;
alter table profiles     enable row level security;

-- rule: tenant isolation OR service_role bypass
create policy tenant_only on events
for all using (
auth.role() = 'service_role'
or tenant_id = (select tenant_id from current_tenant)
);

-- repeat for aggregates, commands …
The current_tenant view checks for a test_tenant_id claim first; if absent it falls back to the real profile mapping.

3 JWT custom claims
Production path
When a user signs up:

Backend Edge Function /onSignup inserts a row in profiles with household_id.

It calls Supabase Admin API auth.admin.updateUserById() to add

json
Copy
Edit
{ "user_metadata": { "household_id": "<UUID>" } }
to the user.

Supabase automatically places household_id inside every JWT.

Testing / CI path
Generate a JWT where:

json
Copy
Edit
{
"sub": "test-user",
"role": "authenticated",
"test_tenant_id": "any-uuid-you-like"
}
The RLS policy will treat that test_tenant_id as the tenant for this request.

You can mint such tokens in Node with @supabase/gotrue-js:

ts
Copy
Edit
import { createClient } from "@supabase/supabase-js";
const sb = createClient(SB_URL, SB_ANON_KEY, { auth: { persistSession:false }});
const { data } = await sb.auth.signInWithIdToken({
provider: "external",
token: JSON.stringify({
sub:"tester", role:"authenticated", test_tenant_id:"11111111-1111-1111-1111-111111111111"
})
});
const jwt = data.session!.access_token;  // use in test headers
Important: keep the role = "authenticated" so the same RLS path executes.

4 Edge Function /command (updated)
ts
Copy
Edit
// functions/command.ts
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const admin = createClient(Deno.env.get("SB_URL"), Deno.env.get("SERVICE_KEY"));

serve(async (req) => {
const jwt = JSON.parse(req.headers.get("x-jwt-payload") ?? "{}"); // Supabase sets this header
const tenant =
jwt.test_tenant_id ?? jwt.household_id ?? new Response("No tenant", { status: 403 });

const cmd = await req.json();                 // shape validation omitted

await admin.from("commands").insert([{ ...cmd, tenant_id: tenant }]);
return new Response("queued", { status: 202 });
});
In tests, send a pre‑minted JWT with test_tenant_id; in prod the header already contains household_id.

5 React client auth flow
ts
Copy
Edit
import { createClient } from "@supabase/supabase-js";
const sb = createClient(SB_URL, SB_ANON_KEY);

export async function signIn(email, pass) {
const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
if (error) throw error;
const tenantId = data.user.user_metadata.household_id;
return { session: data.session, tenantId };
}

/* test helper */
export function signInAsTenant(fakeTenantId: string) {
const jwt = makeFakeJwt({ test_tenant_id: fakeTenantId });
return { session: { access_token: jwt }, tenantId: fakeTenantId };
}
Production UI uses the tenant ID embedded in real JWTs; test code can call signInAsTenant().

6 Temporal routing per tenant
Option A – one Namespace per household

ts
Copy
Edit
await temporal.start(wfMap[cmd.type], {
namespace : cmd.tenant_id,
workflowId: `${cmd.type}-${cmd.id}`,
taskQueue : "main",
args      : [cmd]
});
Option B – shared namespace + prefix IDs

ts
Copy
Edit
namespace : "app",
workflowId: `${cmd.tenant_id}-${cmd.type}-${cmd.id}`,
taskQueue : `tenant-${cmd.tenant_id}`,
Either way, the tenant_id field you wrote into commands (and later pass to workflows) comes straight from authenticated claims or, in tests, from the injected fake claim.

7 End‑to‑end test recipe
Mint fake JWT with { "test_tenant_id": "111…" }.

Set header Authorization: Bearer <jwt> in HTTP and WebSocket clients.

Run Cypress/Playwright script:

call /functions/v1/command

listen on Realtime channel events-111…

assert that event payload matches.

No RLS bypass: even in test, policies enforce per‑tenant filtering because they read the injected claim.

TL;DR
Add profiles & households tables.

RLS policy uses a helper view that first checks for test_tenant_id (for CI/fixtures) then falls back to the real user‑household mapping.

Edge Function pulls tenant directly from JWT (household_id in prod, test_tenant_id in test).

From there, all inserts/selects, Realtime streams, and Temporal workflow IDs stay tenant‑scoped—your hexagonal core never touches auth but still benefits from strict isolation.