# CQRS Read Model Design & Projection Management

This document provides an architectural deep-dive into how Intent implements Command Query Responsibility Segregation (CQRS) and manages projections for read models.

## CQRS Pattern Overview

Command Query Responsibility Segregation (CQRS) is a key architectural pattern in Intent that separates the write model (commands) from the read model (queries). This separation allows each side to be optimized for its specific purpose:

- **Command Side (Write Model)**: Optimized for data consistency, business rule validation, and capturing state changes
- **Query Side (Read Model)**: Optimized for query performance, often using denormalized data structures

In Intent, CQRS works hand-in-hand with Event Sourcing: events generated from commands are projected into read-optimized models that serve queries efficiently.

## Command Side (Write Model)

While the command side is covered in more detail in other sections (see [Domain Modeling](domain-modeling.md) and [Event Sourcing](event-sourcing.md)), it's important to understand how it relates to the read model.

### Command Structure

Commands in Intent are defined by the `Command` interface in `src/core/contracts.ts`:

```typescript
export interface Command<T = any> {
    id: UUID;
    tenant_id: UUID;
    type: string;
    payload: T;
    status?: 'pending' | 'consumed' | 'processed' | 'failed';
    metadata?: Metadata;
}
```

### Command Flow

The command handling process follows these steps:

1. A command is dispatched through the Command Bus
2. The appropriate Command Handler processes the command
3. The Command Handler loads or creates the target Aggregate
4. The Aggregate's `handle` method processes the command and produces events
5. The events are persisted to the Event Store
6. The events are then projected to update read models

This flow is implemented in the `dispatchCommand` function:

```typescript
export async function dispatchCommand(cmd: Command): Promise<void> {
    try {
        // Store the command
        await pgCommandStore.upsert(cmd);

        // Route the command to a handler
        const result: CommandResult = await routeCommand(cmd);

        // Update the command status
        const infraStatus = result.status === 'success' ? 'consumed' : 'failed';
        await pgCommandStore.markStatus(cmd.id, infraStatus, result);
    } catch (error: any) {
        await pgCommandStore.markStatus(cmd.id, 'failed', {status: 'fail', error: error.message});
        throw error;
    }
}
```

## Query Side (Read Model)

The query side is where Intent's projection system comes into play. Projections transform events into read-optimized models that can be queried efficiently.

### Projection Definition

Projections in Intent are implemented as event handlers that update database tables or other storage mechanisms. They implement the `EventHandler` interface:

```typescript
export interface EventHandler<E extends Event = Event> {
  supportsEvent(event: Event): event is E;
  on(event: E): Promise<void>;
}
```

Each projection typically includes:

1. A list of event types it handles
2. A table schema definition
3. Logic for transforming events into read model updates
4. Access control metadata (which roles can read the data)

### Projection Implementation Example

Here's an example of a projection implementation:

```typescript
// Projection metadata defines the table schema and access control
export const projectionMeta = {
  name: 'system_status',
  eventTypes: [SystemEventType.TEST_EXECUTED],
  tables: {
    system_status: {
      columns: {
        id: 'uuid PRIMARY KEY',
        tenant_id: 'uuid NOT NULL',
        last_test_time: 'timestamp',
        test_count: 'integer',
        // ... other columns
      },
    },
  },
  // Access control metadata
  readAccess: {
    roles: ['admin', 'user'],
  },
};

// The projection implementation
export function createSystemStatusProjection(
  updater: ReadModelUpdaterPort<any>
): EventHandler {
  return {
    supportsEvent(event): event is Event<TestExecutedPayload> {
      return projectionMeta.eventTypes.includes(event.type);
    },

    async on(event) {
      // Extract data from the event
      const { tenant_id, aggregateId, payload, metadata } = event;

      // Prepare data for the read model
      const upsertData = {
        id: aggregateId,
        tenant_id,
        last_test_time: new Date(),
        test_count: 1, // This would be incremented in a real implementation
        // ... other fields mapped from the event
      };

      // Update the read model
      await updater.upsert(tenant_id, aggregateId, upsertData);
    },
  };
}
```

### Projection Registration

Projections are registered and loaded dynamically, allowing the system to discover all projections at runtime:

```typescript
export async function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]> {
  const slices = await Promise.all([
    import('../../core/system/read-models/register').then(r => r.registerSystemProjections(pool)),
    // Add more slices here as they are implemented
  ]);

  return slices.flat();
}
```

Each domain module typically has a `register.ts` file that exports all projections for that domain:

```typescript
export async function registerSystemProjections(pool: DatabasePool): Promise<EventHandler[]> {
  const updater = createPgReadModelUpdater(pool);
  
  return [
    createSystemStatusProjection(updater),
    // Other system projections...
  ];
}
```

### Projection Processing

Events are processed by projections in the `projectEvents` function:

```typescript
export async function projectEvents(
    events: Event[],
    pool: DatabasePool,
): Promise<void> {
  const handlers = await loadAllProjections(pool);

  for (const event of events) {
    for (const h of handlers) {
      if (!h.supportsEvent(event)) continue;

      try {
        await traceSpan(`projection.handle.${event.type}`, { event }, () =>
            h.on(event),
        );
      } catch (err) {
        console.warn('Projection failed', { eventType: event.type, error: err });
      }
    }
  }
}
```

This function:
1. Loads all registered projections
2. For each event, finds projections that support the event type
3. Calls the projection's `on` method to update the read model
4. Wraps each projection call in a trace span for observability
5. Catches and logs errors to prevent one projection failure from affecting others

## Schema Management

One of the key challenges in maintaining projections is managing database schemas as projections evolve. Intent addresses this with a sophisticated schema management system.

### Projection Schema Definition

Each projection defines its expected database schema in its metadata:

```typescript
export const projectionMeta = {
  name: 'system_status',
  tables: {
    system_status: {
      columns: {
        id: 'uuid PRIMARY KEY',
        tenant_id: 'uuid NOT NULL',
        // ... other columns
      },
    },
  },
  // ...
};
```

### Schema Drift Detection

Intent includes a tool to detect "schema drift" - discrepancies between the expected schema (defined in code) and the actual database schema:

```typescript
// Simplified example from src/tools/projection-drift/check-projection-drift.ts
export async function checkProjectionDrift(pool: DatabasePool): Promise<DriftResult[]> {
  const projections = await loadAllProjections(pool);
  const results: DriftResult[] = [];
  
  for (const projection of projections) {
    const meta = getProjectionMeta(projection);
    const expectedSchema = meta.tables;
    
    for (const [tableName, tableSchema] of Object.entries(expectedSchema)) {
      const actualSchema = await getTableSchema(pool, tableName);
      const drifts = compareSchemas(tableSchema, actualSchema);
      
      if (drifts.length > 0) {
        results.push({
          projection: meta.name,
          table: tableName,
          drifts,
        });
      }
    }
  }
  
  return results;
}
```

This tool is run in CI to catch schema drift early and can also be run locally during development.

### Schema Repair

When schema drift is detected, Intent provides a tool to automatically generate SQL migrations to fix the discrepancies:

```typescript
// Simplified example from src/tools/projection-drift/repair-projection-drift.ts
export async function repairProjectionDrift(pool: DatabasePool): Promise<string[]> {
  const drifts = await checkProjectionDrift(pool);
  const migrations: string[] = [];
  
  for (const drift of drifts) {
    const sql = generateMigrationSql(drift);
    migrations.push(sql);
    
    if (autoApply) {
      await pool.query(sql);
    }
  }
  
  return migrations;
}
```

This approach allows for:
1. Automatic detection of schema changes
2. Generation of migration scripts
3. Optional automatic application of migrations
4. CI integration to prevent schema drift in production

## Access Policies

A key feature of Intent's projection system is the integration with access control. Each projection declares which roles can read its data:

```typescript
export const projectionMeta = {
  // ...
  readAccess: {
    roles: ['admin', 'user'],
  },
};
```

These access policies are translated into PostgreSQL Row-Level Security (RLS) policies, ensuring that data access is controlled at the database level:

```sql
-- Example generated RLS policy
CREATE POLICY "system_status_admin_user_read_policy" ON "system_status"
  FOR SELECT
  USING (
    current_setting('request.jwt.claims')->>'role' IN ('admin', 'user')
    AND current_setting('request.jwt.claims')->>'tenant_id' = tenant_id::text
  );
```

This ensures that:
1. Only users with the appropriate roles can read the data
2. Users can only see data for their own tenant
3. These rules are enforced at the database level, not just in application code

## Benefits of CQRS in Intent

The CQRS approach in Intent provides several key benefits:

1. **Optimized Models**: Each side (read and write) is optimized for its specific purpose
2. **Scalability**: Read and write sides can be scaled independently
3. **Performance**: Read models can be denormalized for query performance
4. **Flexibility**: New read models can be added without changing the write model
5. **Security**: Access control is built into the read model at the database level

## Challenges and Mitigations

CQRS also presents some challenges, which Intent addresses:

1. **Eventual Consistency**: Read models may lag behind the write model
   - **Mitigation**: Workflow engines ensure reliable processing of events to projections

2. **Complexity**: Managing multiple models adds complexity
   - **Mitigation**: Clear patterns and tooling simplify projection management

3. **Schema Evolution**: Handling changes to event schemas and their impact on projections
   - **Mitigation**: Schema drift detection and repair tools

4. **Synchronization**: Ensuring read models are properly updated when events occur
   - **Mitigation**: The `projectEvents` function is called as part of the command processing workflow

## Extending the System

To create a new projection in Intent:

1. Define a new projection in a domain module's `read-models` directory
2. Define the table schema and access control in the projection metadata
3. Implement the `EventHandler` interface to process relevant events
4. Register the projection in the domain's `register.ts` file
5. Run the schema drift check and repair tool to create the necessary database tables

This process ensures that new projections are consistent with the system's patterns and that the database schema stays in sync with the code.