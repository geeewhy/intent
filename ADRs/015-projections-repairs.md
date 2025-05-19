# ADR-015: Automated Projection Schema Drift Detection and Repair

## **Context**

Backend leverages event sourcing:

* All business changes are represented as events in an immutable log.
* **Read models (projections)** are denormalized, query-optimized tables populated asynchronously from these events, primarily via Postgres.

Over time, projection schemas and logic may drift due to:

* Application feature evolution (new/removed/renamed fields)
* Manual schema migrations or changes
* Event evolution (new event types, modified payloads)
* Incomplete migrations, code refactoring, or coordination bugs

Drift can result in:

* Failing projections (INSERT/UPSERT errors, runtime exceptions)
* Data leakage or missing RLS (access control) enforcement
* Business bugs due to shape or type mismatches
* Developer confusion or loss of trust in system consistency

---

## **Decision**

### **Implement an automated drift detection and repair workflow, with the following characteristics:**

1. **Each projection must export a static metadata object (`projectionMeta`)**

    * Declares: table name, column types, event types handled
    * Example:

      ```ts
      export const projectionMeta = {
        table: 'system_status',
        columnTypes: { /* ... */ },
        eventTypes: ['system.testExecuted'],
      }
      ```

2. **A CI-friendly drift checker tool**

    * Compares the actual table schema (from Postgres `information_schema.columns`) with `columnTypes`
    * Detects:

        * Missing/extra columns
        * Type mismatches
        * Case/underscore/format drift
    * Exits nonzero and prints a diff if drift is found

3. **A fully automated repair tool**

    * For each drifted table:

        1. Drops and recreates the table (using existing migrations)
        2. Reapplies all migrations (schema, indexes, etc.)
        3. Extracts relevant events (using `eventTypes` mapping)
        4. Replays them via the correct projection handler(s)
        5. Regenerates and reapplies RLS policies

4. **All tools are registry-driven**

    * New projections are auto-discovered (via glob or a central registry)
    * No manual list to maintain as codebase scales

---

## **Consequences**

### **Pros**

* **Strong correctness guarantee**: Automated detection and repair ensures read models always match projection logic and event payloads.
* **Operational safety**: Drift can be fixed at any time with no data loss (by replaying events).
* **Scalability**: Adding projections/domains is as simple as exporting correct meta; tooling is extensible.
* **No manual "fix" steps**: No need for ad-hoc SQL or deep domain debugging.
* **Clear audit and logging**: Each repair action is logged and repeatable; problems are visible in CI.
* **Supports rapid schema evolution**: Developers can safely refactor projection logic or DB shape.
* **Easy RLS policy enforcement**: After repair, policies are re-applied, so drifted projections do not weaken access controls.

### **Cons**

* **Replay time cost**: For large tables or many events, full replay can be time-consuming and resource-intensive.
* **Dropping tables is disruptive**: If a table is dropped and rebuilt, downstream consumers may experience temporary unavailability.
* **Requires reliable event sourcing**: Assumes event store is complete and trustworthy; otherwise, replay will produce incomplete state.
* **Code discipline needed**: Developers must maintain accurate `projectionMeta` (including eventTypes, types) for new/changed projections.
* **Registry/handler mapping maintenance**: As the system grows, keeping the registry/loader up to date with domain boundaries is required.
* **Potential for over-repair**: Running the repair tool too eagerly could erase intentional manual corrections in read models.

---

## **Alternatives Considered**

* **Manual drift detection/fixing**: Too error-prone, not scalable, and increases ops burden.
* **Static analysis only**: Detects drift but leaves resolution manual (not operationally sufficient).
* **Migrate-in-place only**: Risky in event-sourced systems; manual migrations may not cover semantic drift in projections.

---

## **Summary**

By enforcing explicit projection metadata, CI-based drift checks, and automated repair tooling (drop, migrate, replay, RLS),
ensured event-sourced read models remain correct, secure, and low-maintenance at scale.

**All new projections must conform to the pattern (`projectionMeta` with table, columns, eventTypes).
Repair is self-service, non-destructive, and works for any projection, any domain, at any time.**

---

### **References**

* `src/core/**/read-models/*.projection.ts`: Projection logic and metadata
* `src/tools/check-projection-drift.ts`: Drift checker
* `src/tools/repair-projection-drift.ts`: Automated repair tool
* `src/infra/projections/pg-updater.ts`, `projectEvents.ts`: Upsert/replay engine
* `src/infra/migrations/runMigrations.ts`: Migration runner
* `src/infra/projections/genRlsSql.ts`: RLS policy emitter
