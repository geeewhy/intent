# Multi-Tenancy Design Details

This document complements the basic multi-tenancy concept page with deeper implementation details on how Intent achieves robust tenant isolation across all layers of the architecture.

## Multi-Tenancy Architecture

Intent is designed from the ground up as a multi-tenant system, allowing a single deployment to serve multiple isolated customer environments (tenants). The implementation follows a "shared database, separate schemas" approach with comprehensive tenant isolation at multiple layers.

## Tenant Identification

Every tenant in the system is identified by a unique `tenant_id` (UUID), which serves as the foundation for isolation. This identifier is:

1. Required in all commands and events
2. Stored in all database tables
3. Included in JWT tokens for authentication
4. Used to scope workflow execution
5. Part of composite primary keys in database tables

This consistent use of `tenant_id` throughout the system ensures that tenant boundaries are maintained across all operations.

## Tenant Isolation Layers

Intent implements tenant isolation at multiple layers of the architecture:

### 1. Database Layer

The database layer is the foundation of tenant isolation in Intent. It uses several techniques to ensure data separation:

#### Schema Approach

Intent uses a "shared database, shared tables" approach where every table includes a `tenant_id` column. This approach offers a good balance between resource efficiency and isolation:

```sql
CREATE TABLE "public"."aggregates" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "type" text NOT NULL,
  "version" int4 NOT NULL,
  "snapshot" jsonb,
  "created_at" timestamptz NOT NULL,
  "schema_version" int4 NOT NULL DEFAULT 1
);

ALTER TABLE "public"."aggregates" ADD CONSTRAINT "aggregates_pkey" PRIMARY KEY ("id", "tenant_id");
```

Key aspects of the database schema design:

1. **Required Tenant ID**: The `tenant_id` column is defined as `NOT NULL` to ensure every record belongs to a tenant
2. **Composite Primary Keys**: Primary keys include `tenant_id` to prevent ID collisions across tenants
3. **Indexing**: Indexes on `tenant_id` improve query performance for tenant-specific data

#### Row-Level Security (RLS)

One of the most powerful features of Intent's multi-tenancy is the use of PostgreSQL's Row-Level Security (RLS) to enforce tenant isolation at the database level:

```sql
-- Example RLS policy generated for a table
CREATE POLICY "tenant_isolation_policy" ON "system_status"
  USING (tenant_id::text = current_setting('request.jwt.claims')->>'tenant_id');
```

This is implemented in the code that generates RLS policies:

```typescript
// From src/infra/projections/genRlsSql.ts
// Add tenant_id check for multi-tenant tables if not already present
if (!hasTenantCheck && hasMultiTenancy) {
  // We'll add the tenant check, assuming the table has a tenant_id column
  sqlCondition = `${sqlCondition} AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;
}
```

The critical benefit of RLS is that it ensures tenant isolation even if application code fails to filter by `tenant_id`. The database itself will enforce the boundary, providing a robust security layer.

#### Session Context

Intent sets a tenant context at the database session level:

```typescript
// From src/infra/pg/pg-command-store.ts
private async setTenantContext(client: PoolClient, tenantId: UUID): Promise<void> {
  await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
}
```

This allows database functions and triggers to access the current tenant context, which can be useful for audit logging, automatic tenant filtering, and other cross-cutting concerns.

### 2. Domain Layer

The domain layer enforces tenant isolation through several mechanisms:

#### Commands and Events

Both commands and events require a `tenant_id` field:

```typescript
// From src/core/contracts.ts
export interface Command<T = any> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  status?: 'pending' | 'consumed' | 'processed' | 'failed';
  metadata?: Metadata;
}

export interface Event<T = any> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  aggregateId: UUID;
  aggregateType: string;
  version: number;
  metadata?: Metadata;
}
```

The command bus enforces tenant consistency between the command and its payload:

```typescript
// From src/core/command-bus.ts
const cmdTenant = cmd.tenant_id;
const payloadTenant = (cmd.payload as any)?.tenantId;

if (payloadTenant && payloadTenant !== cmdTenant) {
  throw new Error(`[Command-bus] Mismatch between command.tenant_id and payload.tenantId`);
}
```

This guard prevents cross-tenant misuse by ensuring that a command's payload tenant matches the command's tenant.

#### Aggregates and Projections

Aggregates and projections maintain tenant isolation when processing events and updating read models:

```typescript
// From src/core/system/read-models/system-status.projection.ts
async on(event) {
  const { tenant_id, aggregateId, payload, metadata } = event;

  if (!tenant_id || !aggregateId || !payload) {
    throw new Error(`[System-Status-Projection] Invalid event ${event.type}. Missing tenant_id, aggregateId, or payload.`);
  }

  const upsertData = {
    id: aggregateId,
    tenant_id,
    // ... other fields
  };

  await updater.upsert(tenant_id, aggregateId, upsertData);
}
```

This ensures that events from one tenant cannot affect the state of another tenant's aggregates or read models.

### 3. API Layer

The API layer is where tenant context is established from incoming requests:

#### JWT-Based Authentication

Intent extracts tenant information from JWT tokens:

```typescript
// From src/infra/supabase/edge-functions/command.ts
// Extract the tenant_id from the JWT claims
const tenantId = user.app_metadata?.tenant_id;
if (!tenantId) {
  return new Response(JSON.stringify({ error: 'Missing tenant_id claim' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

This tenant ID from the JWT becomes the source of truth for all actions performed by the request.

#### Edge Functions

In a serverless environment, Edge Functions can extract the tenant ID from the JWT and use it to scope all operations:

```typescript
// Example Edge Function that extracts tenant_id from JWT
export async function handleRequest(req: Request) {
  // Get the JWT from the Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyJWT(token);
  
  // Extract tenant_id from the JWT claims
  const tenantId = decoded.claims.tenant_id;
  if (!tenantId) {
    return new Response('Missing tenant_id claim', { status: 403 });
  }
  
  // Use the tenant_id for all operations
  // ...
}
```

### 4. Processing Layer

The processing layer ensures that workflows and messaging are tenant-scoped:

#### Temporal Workflows

Workflow execution is scoped by tenant:

```typescript
// From src/infra/temporal/workflow-router.ts
const {tenant_id} = cmd;
const {aggregateType, aggregateId} = cmd.payload;
const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

// Execute with tenant tags for observability
const result = await this.client.workflow.execute(processCommand, {
  taskQueue: this.taskQueue,
  workflowId,
  searchAttributes: {
    tenantId: [`${tenant_id}`],
  },
  args: [tenant_id, aggregateType, aggregateId, cmd],
});
```

This ensures that:
1. Workflow IDs include the tenant ID, preventing cross-tenant interference
2. Search attributes include tenant information for filtering in the Temporal UI
3. The tenant ID is passed to the workflow for use in all activities

#### Event Publication and Subscription

Events are published to tenant-specific channels:

```typescript
// From src/infra/supabase/supabase-publisher.ts
.channel(`tenant-${event.tenant_id}`)
```

This ensures that subscribers only receive events for their specific tenant, preventing information leakage across tenant boundaries.

## Testing & Verification

Intent includes integration tests specifically designed to verify tenant isolation:

```typescript
// From src/infra/integration-tests/projection.integration.test.ts
// Verify tenant isolation
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)).toBe(true);
```

These tests ensure that:
1. Data created for one tenant is only visible to that tenant
2. Operations for one tenant do not affect data for other tenants
3. RLS policies correctly enforce tenant boundaries

## Trade-offs and Considerations

Intent currently uses a single database with RLS as opposed to separate databases per tenant. This approach has several trade-offs:

### Advantages

1. **Simpler Schema Management**: A single schema to maintain and evolve
2. **Resource Efficiency**: Better utilization of database resources
3. **Operational Simplicity**: Easier backup, monitoring, and scaling
4. **Feature Parity**: All tenants get the same features simultaneously

### Challenges

1. **Noisy Neighbor Risk**: One tenant's heavy usage could impact others
2. **Security Complexity**: RLS must be correctly implemented everywhere
3. **Query Performance**: Filtering by tenant_id adds overhead
4. **Blast Radius**: Database issues affect all tenants

Intent mitigates these challenges through:
1. Comprehensive testing of tenant isolation
2. Automated RLS policy generation and verification
3. Performance optimization of tenant-filtered queries
4. Careful resource allocation and monitoring

## Extending Multi-Tenancy

When implementing new features in Intent, developers should:

1. Ensure all database tables include a `tenant_id` column
2. Include tenant_id in all commands and events
3. Verify that RLS policies are generated for new tables
4. Test cross-tenant isolation for new features
5. Consider tenant-specific resource limits if needed

By following these guidelines, the system maintains its strong tenant isolation as it evolves.