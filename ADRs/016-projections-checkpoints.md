# ADR-016: **Per-Projection Checkpointing via Embedded Last Event ID/Version**

## Status

Accepted

## Context

The system uses event-sourced aggregates and CQRS-style projections, with real-time and multi-tenant requirements. Projections are backed by Postgres tables and populated by handlers reacting to domain events.
We must ensure:

* Atomic, crash-safe, resumable, and scalable projection updates.
* Minimal coupling and operational complexity.

## Decision

**Each projection table row will embed its own checkpoint—`last_event_id` (and optionally `last_event_version`)—updated atomically with projection state in the same transaction.**

* On each event processed, the handler will upsert both the projection state and checkpoint.
* No global or separate checkpoint table will be maintained for per-row projections.
* Recovery, idempotence, and replay are implemented by reading the last processed checkpoint per projection row and replaying events from the next offset as needed.

### Example (System Status Projection)

```sql
ALTER TABLE system_status
  ADD COLUMN last_event_id UUID,
  ADD COLUMN last_event_version INTEGER;
```

When applying an event:

```ts
await updater.upsert(tenant_id, aggregateId, {
  ...projectionFields,
  last_event_id: event.id,
  last_event_version: event.version,
});
```

## Consequences

**Advantages:**

* **Atomicity:** Projection and checkpoint are always in sync—no chance of partial update or crash inconsistency.
* **Recovery Simplicity:** After a crash/restart, load the row, get its checkpoint, and resume from the next event—no split-brain.
* **Isolation:** Each projection row tracks its own stream, supporting high-cardinality, multi-tenant, and sharded projections.
* **No global locks or join logic** for checkpointing—scales to thousands/millions of projections.

**Disadvantages:**

* Adds two fields to each projection table (minor storage cost).
* Cannot easily track global progress across all projections in one query (not required for CQRS/read-side patterns).

**Alternatives Rejected:**

* **Separate Checkpoint Table:** Adds complexity, risk of out-of-sync state, and introduces multi-table transactional coupling.
* **No Checkpointing:** Makes resumable, crash-tolerant, idempotent projection nearly impossible at scale.

## Alignment

This pattern is recommended in modern ES/CQRS literature for high-cardinality systems. It is a common approach in event-sourced architectures to ensure that projections can be independently updated and recovered without global state management.

## See Also

* Research: *Understanding Event Sourcing*, Chapter: Projections and Consistency
* Core: `/src/infra/projections/pg-updater.ts`
* Previous ADRs: [015](015-projections-repairs.md) [014](014-projections-schema-drift.md) [012](012-projections.md)
