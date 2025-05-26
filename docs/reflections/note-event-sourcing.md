# Event Sourcing in Intent

## Overview

Event Sourcing is a fundamental architectural pattern in Intent. Instead of storing just the current state of the system, event sourcing persists all changes to the application state as a sequence of events. These events serve as the source of truth, and the current state can be derived by replaying these events.

## Implementation Details

### Event Structure

Events in the system are defined by the `Event` interface in `src/core/contracts.ts`:

```typescript
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

Key components:
- **id**: Unique identifier for the event
- **tenant_id**: Supports multi-tenancy
- **type**: Describes what happened
- **payload**: Contains the event data
- **aggregateId**: The ID of the aggregate this event applies to
- **aggregateType**: The type of the aggregate
- **version**: Sequential version number for the aggregate
- **metadata**: Additional information like timestamps, correlation IDs, etc.

### Event Store

The event store is implemented in `src/infra/pg/pg-event-store.ts` using PostgreSQL. It provides methods for:

1. **Appending events**: Adding new events to an aggregate's event stream
2. **Loading events**: Retrieving events for a specific aggregate
3. **Creating snapshots**: Capturing the current state of an aggregate
4. **Loading snapshots**: Retrieving the latest snapshot for an aggregate

### Aggregate Rehydration

Aggregates are rehydrated from events using the `rehydrate` static method defined in the `AggregateClass` interface:

```typescript
export interface AggregateClass {
  new (id: string): any;
  create: (cmd: any) => any;
  rehydrate: (events: any[]) => any;
}
```

The `loadAggregate` function in `src/infra/temporal/activities/coreActivities.ts` demonstrates the rehydration process:

1. First, try to load a snapshot if available
2. Then, load events after the snapshot version
3. Apply the events to rebuild the aggregate's state

### Snapshots

To optimize performance, the system supports snapshots:

1. A snapshot is a point-in-time capture of an aggregate's state
2. Snapshots reduce the need to replay all events from the beginning
3. When loading an aggregate, the system first loads the latest snapshot, then applies only the events that occurred after the snapshot

The `snapshotAggregate` function in `coreActivities.ts` creates snapshots:

```typescript
export async function snapshotAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
): Promise<void> {
    // Load the aggregate
    const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);

    // Create and store the snapshot
    await eventStore.snapshotAggregate(tenantId, aggregate);
}
```

## Benefits and Challenges

### Benefits

1. **Complete Audit Trail**: Every change is recorded as an event, providing a complete history
2. **Temporal Queries**: The ability to determine the state of the system at any point in time
3. **Event Replay**: The system can be rebuilt by replaying events
4. **Separation of Concerns**: Clear separation between write and read models (CQRS)

### Challenges

1. **Performance**: Loading aggregates requires replaying events, which can be slow for aggregates with many events (mitigated by snapshots)
2. **Schema Evolution**: Handling changes to event schemas over time (mitigated by upcasting)
3. **Eventual Consistency**: Read models may lag behind the event store (mitigated by workflow runtimes)
4. **Complexity**: Event sourcing adds complexity compared to traditional CRUD approaches (debatable based on use-case)

## Integration with Other Patterns

Event sourcing in Intent integrates with several other patterns:

1. **CQRS**: Events from the event store are projected to read models for querying
2. **Domain-Driven Design**: Events represent domain concepts and are used to rebuild aggregates
3. **Temporal Workflows**: Complex processes are orchestrated using events and commands
4. **Observability**: Events provide a basis for system monitoring and tracing
