# 007- ADR: System Proposal: Event Sourced Aggregate Management with Temporal

## Goals

- Implement deterministic event-sourced aggregates through `EventStorePort` abstraction.
- Support snapshots internally inside ports to optimize loading.
- Domain aggregates must implement their own apply(event) and handle(command) methods to allow activities to apply/execute properly.
- Guarantee that only one live instance of an aggregate exists at a time across the system using Temporal.
- Enforce immediate execution of commands and event publishing during workflow signal handling to maintain in-memory aggregate state.
- Allow workflows to expire aggregates after a minimum TTL of inactivity to optimize memory and system resource usage.
- Ensure Temporal workflows can safely restart from persisted state using PostgresEventStore.
- Maintain strict separation of core domain logic and infrastructure via clean hexagonal ports.
- Enable in-memory event store for unit tests, Postgres event store for production.
- Core domain remains replay-safe and deterministic, relying only on defined interfaces.
- When you load from snapshots and replay events, rebuild the aggregate only from the events after the snapshot.
- Aggregates are rebuilt from snapshots (if available) plus any newer events. If no snapshot exists, full event replay from version 0 is performed.
---

# Implementation Plan

## 1. Event and Command Storage Schema

Define two flat Postgres tables:

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_payload JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (tenant_id, aggregate_type, aggregate_id, version)
);

CREATE TABLE commands (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    command_type TEXT NOT NULL,
    command_payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

- `events` table is versioned per `(tenant_id, aggregate_type, aggregate_id)`.
- `commands` table is flat for audit/logging purposes.

## 2. Event Store Ports

Define two implementations of `EventStorePort`:

- **InMemoryEventStore** (`core/__tests__` or `infra/memory`)
    - Uses `Map<string, { version: number, events: Event[] }>`
    - Key format: `tenantId-aggregateType-aggregateId`
    - Strict optimistic concurrency control based on version.

- **PostgresEventStore** (`infra/pg/pg-event-store.ts`)
    - Safe transaction with `FOR UPDATE` locking during append.
    - Appends events under tenant, aggregateType, aggregateId.
    - Replays events ordered by version.
    - Snapshotting handled internally later (future-proof).

Both respect:

```typescript
export interface EventStorePort {
  append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number): Promise<void>;
  load(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ events: Event[]; version: number } | null>;
}
```

## 3. Temporal Workflow Namespacing

- Every Temporal workflow for aggregates must be started with workflowId:

```
{tenantId}_{aggregateType}-{aggregateId}
```

- Guarantees that only one workflow per aggregate is active at a time.
- Signals and commands route deterministically.

## 4. Command and Event Handling during Workflow Execution

- Incoming signals (commands, events) are handled immediately.
- Aggregates are kept alive in memory inside the workflow.
- After command/event application:
    - Aggregate emits new events.
    - New events are immediately persisted via EventStorePort and published if necessary.

No external reloads or replays while workflow is alive.

## 5. Workflow Aggregate Time-To-Live

- Introduce minimum TTL configuration per workflow.
- After inactivity (no new signals for TTL duration), workflow self-terminates cleanly.
- If a new command arrives after termination:
    - A new Temporal workflow is created.
    - Aggregate is loaded from EventStorePort (with snapshot optimization if available).

Minimum TTL logic implemented using:

```typescript
await condition(() => signalReceived || elapsedSinceLastSignal > TTL);
```

## 6. Core Domain Purity

- Core domain (aggregates, services, sagas) must interact **only** through defined ports (e.g., `EventStorePort`, `CommandPort`, `EventPort`).
- No direct database, Temporal, or infrastructure code inside core.
- Ensures determinism, replay safety, and unit testability.
- Follows patterns already established like `SagaContext`.

---

# Directory Structure Suggestions

The current structure can continue mostly as-is, with the following refinements:

```
core/
  ├── ports.ts           # includes EventStorePort, CommandPort etc
  ├── events/            # optional: extracted event contracts
infra/
  ├── memory/             # in-memory event store for tests
  │   └── memory-event-store.ts
  ├── pg/
  │   └── pg-event-store.ts
worker.ts                 # start Temporal workers
infra/temporal/workflows/  # processSaga, processCommand, processEvent
infra/temporal/activities/ # coreActivities
```

---

# Other Considerations

| Topic | Comment |
|:------|:--------|
| Snapshots | Not immediately necessary, but ports should be designed to allow injecting snapshot loading later without aggregate code changes |
| Schema Migrations | Strongly recommend using migrations tool (e.g., Prisma, DBMate, Sqitch) for maintaining event/command tables |
| Replayability Testing | Consider implementing a simple test that replays stored events through aggregates to assert backward compatibility periodically |
| Event Type Evolution | Long-term, if event shapes evolve, you will eventually need an upcasting mechanism (load old event, patch shape) |
| Performance | For high-frequency systems, consider batched inserts into Postgres using UNNEST for appending events faster, but not critical immediately |

Here is the **precise and concise section** you can add to the proposal under **Concurrency and Workflow Management**:

## Concurrency and Workflow Management

Each aggregate instance must have at most one active workflow at a time to prevent race conditions. This is enforced by:

- Assigning a consistent `workflowId` for all workflows based on `{tenantId}_{aggregateType}-{aggregateId}`.
- Setting `workflowIdReusePolicy: WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE` when starting workflows to reject duplicate starts if an active workflow already exists.
- Using Temporal signals to send new commands or events to the existing workflow instance instead of starting new workflows.

TaskQueue separation (`sagas` for process managers, `aggregates` for direct aggregate handlers) does not affect concurrency guarantees. Temporal enforces uniqueness at the `workflowId` level across all taskQueues.

This design ensures that all mutations to a given aggregate are serialized through a single, live workflow instance, maintaining strong consistency without race conditions.

# Implementation Details

InMemoryEventStore: Event objectIn filter(e => e.version > snapshot.version), dont assume event.version exists	maintain {event, version}, enrich Event type with version
PgEventStore: id generation for events. dont assume event.id is already present	Ensure that Event objects passed to append already include a UUID id, or else you need to generate it in append() method
Core Activity executeCommand []	you must call into your Aggregate methods (e.g., orderAggregate.execute(cmd) and collect produced domain events
Core Activity loadAggregate you will need to apply domain events properly to build the actual domain object, not just empty version metadata
processCommand TTL should be: await condition(() => Date.now() - lastActivity < TTL) so that it exits when timeout is exceeded, not before
Temporal Workflow Reuse Behavior Configure how new workflow start attempts behave with workflowIdReusePolicy: WorkflowIdReusePolicy: 'WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE'

# Summary

You have a clean, production-grade architecture plan that:

- Separates infrastructure from domain properly
- Enables fully event-sourced aggregates
- Guarantees safe, isolated aggregate ownership in Temporal
- Supports testing via clean, in-memory event store
- Keeps Temporal workflows efficient and replay-safe
- Leaves room for snapshots, upcasters, and scale-out when necessary
