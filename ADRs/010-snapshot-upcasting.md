# ADR-010: Snapshot Schema Versioning

## What

Introduce versioned snapshot support in the `aggregates` table and aggregate core logic. Each aggregate snapshot includes a `schemaVersion` which determines how to upcast the raw snapshot state before applying it to an aggregate instance. Aggregates expose an optional `upcastSnapshotState()` method to support backwards compatibility with older snapshot versions.

## Why

Snapshot schemas may evolve over time as the domain model changes. To preserve determinism and enable safe rehydration from legacy snapshots, the system must support version-aware loading and controlled upcasting. This avoids corrupt state and removes the need for destructive snapshot invalidation or replays. Upcasting logic stays in the aggregate where the state structure is owned, not in infrastructure.

## Implications

* All snapshots must include a `schemaVersion` column (default: 1).
* The `Snapshot<T>` contract now includes `schemaVersion`.
* Aggregates define `CURRENT_SCHEMA_VERSION` and override `upcastSnapshotState()` as needed.
* `applySnapshotState(raw, version)` uses schema versioning to upcast before applying to the instance.
* `PgEventStore.loadSnapshot()` loads the snapshot state and schema version from the DB.
* Snapshots written via `toSnapshot()` always use the current schema version.
* Tests can safely use snapshots from prior versions for regression assertions.

## How

* Extend the `Snapshot<T>` interface to include `schemaVersion`.
* Update `BaseAggregate` with:

    * `CURRENT_SCHEMA_VERSION`
    * `applySnapshotState(raw, version?)`
    * `upcastSnapshotState()` (optional override)
* Add `loadSnapshot()` in `PgEventStore` to return both `state` and `schemaVersion`.
* In the `loadAggregate()` activity, call `applySnapshotState(state, schemaVersion)` explicitly.
* Modify the `aggregates` table schema to include a `schema_version` column with default 1.

## Alternatives Considered

* Encoding version inside the snapshot payload itself (e.g. `"v1":{...}`): rejected for added complexity and awkward deserialization.
* Creating multiple aggregate classes per version: rejected for high maintenance cost and lack of code reuse.
* Emitting version-change events in the stream: rejected as domain-irrelevant metadata.

## Result

Aggregates now support versioned snapshots. Legacy snapshots are loaded safely and upcasted inside each aggregate. Core logic remains pure and testable. Snapshot evolution becomes a controlled and reversible operation. Snapshot state management is now resilient to structural drift over time, and core aggregates remain cleanly separated from DB format concerns.
