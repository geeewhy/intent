# Multi-tenancy Implementation in Intent

## Overview

Multi-tenancy is a core architectural feature of Intent, allowing the system to serve multiple isolated customer environments (tenants) from a single deployment. The implementation follows a "shared database, separate schemas" approach with comprehensive tenant isolation at multiple levels: data access, authentication, authorization, and processing.

## Core Concepts

### Tenant Identification

Every tenant in the system is identified by a unique `tenant_id` (UUID), which is:

1. Required in all commands and events
2. Stored in all database tables
3. Included in JWT tokens for authentication
4. Used to scope workflow execution

### Tenant Isolation Layers

The system implements tenant isolation at multiple layers:

1. **Data Layer**: Database-level isolation through tenant_id columns and row-level security
2. **Domain Layer**: Commands and events are scoped to tenants
3. **API Layer**: Authentication and authorization enforce tenant boundaries
4. **Processing Layer**: Workflows and projections maintain tenant isolation

## Implementation Details

### Data Layer Isolation

#### Database Schema Design

The database schema includes `tenant_id` as a required field in all multi-tenant tables:

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

Key aspects:
1. `tenant_id` is defined as NOT NULL to ensure every record belongs to a tenant
2. Composite primary keys include `tenant_id` to prevent ID collisions across tenants
3. Indexes on `tenant_id` improve query performance for tenant-specific data

#### Row-Level Security (RLS)

The system uses PostgreSQL's Row-Level Security to enforce tenant isolation at the database level:

```typescript
// From src/infra/projections/genRlsSql.ts
// Add tenant_id check for multi-tenant tables if not already present
if (!hasTenantCheck && hasMultiTenancy) {
  // We'll add the tenant check, assuming the table has a tenant_id column
  sqlCondition = `${sqlCondition} AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;
}
```

This ensures that even if application code fails to filter by tenant_id, the database will still enforce tenant isolation.

#### Session Context

The system sets a tenant context at the database session level:

```typescript
// From src/infra/pg/pg-command-store.ts
private async setTenantContext(client: PoolClient, tenantId: UUID): Promise<void> {
  await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
}
```

This allows database functions and triggers to access the current tenant context.

### Domain Layer Isolation

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

#### Projections

Projections maintain tenant isolation when updating read models:

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

### API Layer Isolation

#### JWT-Based Authentication

The system extracts tenant information from JWT tokens:

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

#### Authorization Policies

Access control policies enforce tenant boundaries:

```typescript
// SQL query with tenant isolation
AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text
```

### Processing Layer Isolation

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

#### Event Publication

Events are published to tenant-specific channels:

```typescript
// From src/infra/supabase/supabase-publisher.ts
.channel(`tenant-${event.tenant_id}`)
```

## Testing Multi-tenancy

The system includes integration tests that verify tenant isolation:

```typescript
// From src/infra/integration-tests/projection.integration.test.ts
// Verify tenant isolation
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)).toBe(true);
```

## Benefits of the Multi-tenancy Approach

1. **Resource Efficiency**: A single deployment serves multiple customers
2. **Operational Simplicity**: Centralized management and monitoring
3. **Data Isolation**: Strong security boundaries between tenants
4. **Scalability**: Can scale to support many tenants
5. **Consistent Experience**: All tenants benefit from the same features and updates

## Challenges and Considerations

1. **Query Performance**: Filtering by tenant_id can impact performance without proper indexing
2. **Development Complexity**: All code must be tenant-aware
3. **Testing Overhead**: Must test for proper tenant isolation
4. **Security Risks**: Bugs in tenant isolation could lead to data leakage
5. **Resource Contention**: Noisy neighbor problems without proper resource allocation

## Integration with Other Patterns

Multi-tenancy in Intent integrates with several other patterns:

1. **Event Sourcing**: Events are scoped by tenant_id
2. **CQRS**: Read models maintain tenant isolation
3. **Domain-Driven Design**: Aggregates operate within tenant boundaries
4. **Temporal Workflows**: Workflows respect tenant isolation
