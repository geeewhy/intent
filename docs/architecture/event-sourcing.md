# Event Sourcing Pattern & Event Store

This document covers how event sourcing is implemented in Intent and the architectural considerations behind it.

## What is Event Sourcing?

Event Sourcing is a fundamental architectural pattern in Intent. Instead of storing just the current state of the system, event sourcing persists all changes to the application state as a sequence of events. These events serve as the source of truth, and the current state can be derived by replaying these events.

In traditional CRUD systems, you might update a record directly in a database. With event sourcing, you instead record the fact that a change occurred as an event, and then derive the current state by processing all events.

## Event Structure

Events in Intent are defined by the `Event` interface in `src/core/contracts.ts`:

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

Key components of an event:

- **id**: Unique identifier for the event
- **tenant_id**: Supports multi-tenancy (every event belongs to a specific tenant)
- **type**: Describes what happened (e.g., `USER_REGISTERED`, `ORDER_PLACED`)
- **payload**: Contains the event data specific to the event type
- **aggregateId**: The ID of the aggregate this event applies to
- **aggregateType**: The type of the aggregate (e.g., `user`, `order`)
- **version**: Sequential version number for the aggregate (used for optimistic concurrency)
- **metadata**: Additional information like timestamps, correlation IDs, etc.

## The Event Store

The event store is the heart of an event-sourced system. In Intent, the event store is implemented in `src/infra/pg/pg-event-store.ts` using PostgreSQL. It provides several key capabilities:

### 1. Appending Events

When a command is processed and results in state changes, the event store appends new events to the aggregate's event stream:

```typescript
async appendEvents(tenantId: UUID, events: Event[]): Promise<void> {
    // Validate events
    // Ensure optimistic concurrency (check version)
    // Insert events into the database
}
```

The event store ensures that events are appended atomically and that version numbers are sequential to maintain consistency.

### 2. Loading Events

To rebuild an aggregate's state, the event store can load all events for a specific aggregate:

```typescript
async loadEvents(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    afterVersion?: number
): Promise<Event[]> {
    // Query the database for events matching the criteria
    // Optionally filter events after a specific version (for use with snapshots)
    // Return the events in version order
}
```

### 3. Snapshot Management

The event store also handles creating and loading snapshots:

```typescript
async snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void> {
    // Create a snapshot from the aggregate's current state
    // Store the snapshot in the database
}

async loadLatestSnapshot(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<Snapshot<any> | null> {
    // Query the database for the latest snapshot of the aggregate
    // Return null if no snapshot exists
}
```

## Aggregate Rehydration

One of the key operations in an event-sourced system is "rehydrating" an aggregate from its event history. Intent implements this process in the `loadAggregate` function:

```typescript
export async function loadAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<BaseAggregate<any>> {
    // 1. Try to load the latest snapshot
    const snapshot = await eventStore.loadLatestSnapshot(tenantId, aggregateType, aggregateId);
    
    // 2. Determine the starting version (0 or snapshot version)
    const startingVersion = snapshot ? snapshot.version : 0;
    
    // 3. Load events after the snapshot version
    const events = await eventStore.loadEvents(
        tenantId,
        aggregateType,
        aggregateId,
        startingVersion
    );
    
    // 4. Create or rehydrate the aggregate
    let aggregate;
    if (snapshot) {
        // Create from snapshot
        const AggregateClass = AggregateRegistry[aggregateType];
        aggregate = AggregateClass.fromSnapshot(snapshot);
    } else if (events.length > 0) {
        // Rehydrate from events
        const AggregateClass = AggregateRegistry[aggregateType];
        aggregate = AggregateClass.rehydrate(events);
    } else {
        // Aggregate doesn't exist yet
        throw new Error(`Aggregate ${aggregateType}:${aggregateId} not found`);
    }
    
    // 5. Apply any events after the snapshot
    if (snapshot) {
        for (const event of events) {
            aggregate.apply(event);
        }
    }
    
    return aggregate;
}
```

This process ensures that aggregates can be efficiently loaded from their event history, with snapshots providing optimization for aggregates with long histories.

## Snapshots

Snapshots are a performance optimization in event sourcing. Without snapshots, loading an aggregate would require replaying all events from the beginning of time, which could be slow for aggregates with many events.

### How Snapshots Work

1. A snapshot is a point-in-time capture of an aggregate's state
2. When loading an aggregate, the system first loads the latest snapshot
3. Then it only needs to apply events that occurred after the snapshot was taken
4. Snapshots are typically created periodically or after a certain number of events

The `snapshotAggregate` function demonstrates how snapshots are created:

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

This function is typically called by an activity as part of the command processing workflow.

## Schema Evolution

A key challenge in event sourcing is handling changes to event schemas over time. Intent addresses this through several mechanisms:

### Event Upcasting

When event schemas change, older events may need to be transformed to match the current schema. This process is called "upcasting":

1. Events are stored with their original schema
2. When loading events, upcasters transform old events to the current schema
3. This ensures backward compatibility without modifying the original events

Intent follows rules for event schema evolution as documented in ADR-017 (Event Upcasting):

- Events should be designed for backward compatibility when possible
- Adding new optional fields is safe
- Removing fields requires upcasters
- Changing field types requires upcasters

### Snapshot Upcasting

Similar to events, snapshots also need to handle schema changes. Intent supports snapshot upcasting as documented in ADR-010 (Snapshot Upcasting):

1. Snapshots include a schema version number
2. When loading a snapshot with an older schema version, the system upcasts it to the current version
3. This is implemented in the `applySnapshotState` method of `BaseAggregate`

## Benefits of Event Sourcing in Intent

Event sourcing provides several key benefits in the Intent architecture:

1. **Complete Audit Trail**: Every change is recorded as an event, providing a complete history of all changes to the system.

2. **Temporal Queries**: The ability to determine the state of the system at any point in time by replaying events up to that point.

3. **Event Replay**: The system can be rebuilt by replaying events, which is useful for testing, debugging, and creating new projections.

4. **Separation of Concerns**: Clear separation between write and read models (CQRS), allowing each to be optimized independently.

5. **Business Insight**: Events represent business activities and can be analyzed to gain insights into system usage and behavior.

## Challenges and Mitigations

Event sourcing also presents some challenges, which Intent addresses:

1. **Performance**: Loading aggregates requires replaying events, which can be slow for aggregates with many events.
   - **Mitigation**: Intent uses snapshots to optimize loading time.

2. **Schema Evolution**: Handling changes to event schemas over time.
   - **Mitigation**: Intent supports upcasting for both events and snapshots.

3. **Eventual Consistency**: Read models may lag behind the event store.
   - **Mitigation**: Temporal workflows ensure reliable processing of events to projections.

4. **Complexity**: Event sourcing adds complexity compared to traditional CRUD approaches.
   - **Mitigation**: Intent provides a structured framework and clear patterns to manage this complexity.

## Integration with Other Patterns

Event sourcing in Intent integrates with several other architectural patterns:

1. **CQRS**: Events from the event store are projected to read models for querying.
2. **Domain-Driven Design**: Events represent domain concepts and are used to rebuild aggregates.
3. **Temporal Workflows**: Complex processes are orchestrated using events and commands.
4. **Observability**: Events provide a basis for system monitoring and tracing.