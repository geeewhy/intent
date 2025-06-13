# ADR-009: Migration Plan  --  From Embedded Snapshot in `load()` to Separate `loadSnapshot()` + `load()`

## What

Refactor the `PgEventStore` so that snapshot loading and event loading are split into two explicit infrastructure methods: `loadSnapshot()` and `load()`. The core no longer relies on an embedded behavior that combines both steps. Aggregate rehydration becomes an explicit sequence in the activity layer: apply snapshot → replay post-snapshot events.

## Why

Embedding snapshot logic inside `load()` conflates two responsibilities and hides infrastructure behavior behind a single call. It makes testability, introspection, and control over the aggregate rehydration process harder. This refactor improves composition and makes the flow of loading state deterministic and observable. It also future-proofs the `EventStorePort` interface for other implementations.

## Implications

* `PgEventStore.load()` becomes a pure event loader, taking a `fromVersion` argument.
* A new method `loadSnapshot()` is introduced to load the latest snapshot (if any).
* `loadAggregate()` in the activity layer is updated to invoke `loadSnapshot()` and `load()` explicitly.
* No domain logic changes -- only infrastructure composition shifts.
* The rest of the system continues using `loadAggregate()` as a single entrypoint.
* `PgEventStore.load()` no longer applies any snapshot; it only returns events from a given version onward.

## How

* Extract the snapshot query logic from `PgEventStore.load()` into a new method `loadSnapshot()`.
* Refactor the old `load()` method to require a `fromVersion` argument (defaulting to 0).
* Update `coreActivities.loadAggregate()` to:

    1. Call `loadSnapshot()`
    2. Apply snapshot state to the aggregate
    3. Call `load(fromVersion = snapshot.version)`
    4. Apply all resulting events
* Audit all other Temporal activities to ensure they use `loadAggregate()` and do not rely on implicit snapshot behavior.
* Remove and clean up any embedded snapshot handling in the old `load()` method.

## Alternatives Considered

* Keeping embedded snapshot logic: rejected due to opacity and poor separation of concerns.
* Snapshot loading via event stream markers (e.g., `SnapshotRestored` event): rejected in ADR-008 as an anti-pattern.

## Result

Snapshot and event loading are now cleanly separated in infrastructure code. Aggregates are rehydrated through an explicit and deterministic sequence. Domain code remains pure and unaware of the change. Testing and debugging are simplified. Snapshot handling is now composable and extensible across storage implementations.
