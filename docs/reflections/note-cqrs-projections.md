# CQRS and Projections in Intent

## Overview

Command Query Responsibility Segregation (CQRS) is a key architectural pattern in Intent. CQRS separates the write model (commands) from the read model (queries), allowing each to be optimized for its specific purpose. This pattern works hand-in-hand with Event Sourcing, where events generated from commands are projected into read-optimized models.

## Command Side (Write Model)

### Command Structure

Commands in the system are defined by the `Command` interface in `src/core/contracts.ts`:

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

Key components:
- **id**: Unique identifier for the command
- **tenant_id**: Supports multi-tenancy
- **type**: Describes the intent
- **payload**: Contains the command data
- **status**: Tracks the command's lifecycle
- **metadata**: Additional information like timestamps, correlation IDs, etc.

### Command Handling

The command handling process involves several components:

1. **Command Bus**: Routes commands to appropriate handlers (`src/core/command-bus.ts`)
2. **Command Handlers**: Domain services that implement the `CommandHandler` interface
3. **Aggregates**: Domain entities that encapsulate business rules and state changes
4. **Event Generation**: Commands result in events that represent state changes

The `dispatchCommand` function in `src/infra/temporal/activities/coreActivities.ts` shows the command handling flow:

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

### Projections

Projections transform events into read-optimized models. They are implemented as event handlers that update database tables or other storage mechanisms.

The `EventHandler` interface in `src/core/contracts.ts` defines the contract for projections:

```typescript
export interface EventHandler<E extends Event = Event> {
  supportsEvent(event: Event): event is E;
  on(event: E): Promise<void>;
}
```

### Projection Implementation

Projections are typically implemented in domain-specific files under `src/core/slices/*/read-models/` and `src/core/example-slices/*/read-models/`. For example, the system status projection in `src/core/example-slices/system/read-models/system-status.projection.ts`:

```typescript
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
        // ... other fields mapped from the event
      };

      // Update the read model
      await updater.upsert(tenant_id, aggregateId, upsertData);
    },
  };
}
```

### Projection Registration

Projections are registered and loaded dynamically in `src/infra/projections/loadProjections.ts`:

```typescript
export async function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]> {
  const slices = await Promise.all([
    import('../../core/example-slices/system/read-models/register').then(r => r.registerSystemProjections(pool)),
    // Add more slices here as they are implemented
  ]);

  return slices.flat();
}
```

### Projection Processing

Events are processed by projections in the `projectEvents` function in `src/infra/projections/projectEvents.ts`:

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

## Schema Management

The system includes tools for managing projection schemas:

1. **Projection Metadata**: Each projection defines its table schema in a `projectionMeta` object
2. **Schema Drift Detection**: The `check-projection-drift.ts` tool compares the expected schema with the actual database schema
3. **Schema Repair**: The `repair-projection-drift.ts` tool can fix schema discrepancies

## Benefits and Challenges

### Benefits

1. **Optimized Models**: Each side (read and write) can be optimized for its specific purpose
2. **Scalability**: Read and write sides can be scaled independently
3. **Performance**: Read models can be denormalized for query performance
4. **Flexibility**: New read models can be added without changing the write model

### Challenges

1. **Eventual Consistency**: Read models may lag behind the write model
2. **Complexity**: Managing multiple models adds complexity
3. **Schema Evolution**: Handling changes to event schemas and their impact on projections
4. **Synchronization**: Ensuring read models are properly updated when events occur

## Integration with Other Patterns

CQRS and projections in Intent integrate with several other patterns:

1. **Event Sourcing**: Events from the event store are the input to projections
2. **Domain-Driven Design**: Commands and events represent domain concepts
3. **Temporal Workflows**: Complex processes may involve multiple commands and events
4. **Multi-tenancy**: Projections maintain tenant isolation in read models
