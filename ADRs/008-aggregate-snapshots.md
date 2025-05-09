# ADR-008: Aggregate Snapshots

### Final Snapshot Strategy

**Trigger:**
Take a snapshot **every 2 successful `applyEvent` executions**, and only after `applyEvent`, not `executeCommand`.

**Reasoning:**
This ensures snapshots reflect the most current aggregate state, especially after domain-driven transitions (not just command intent).

---

### Changes by File

#### `pg-event-store.ts`

* Add:

  ```ts
  async snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void> {
    const snapshot = aggregate.toSnapshot();
    await this.pool.query(`
      INSERT INTO aggregates (id, tenant_id, type, version, snapshot, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id, tenant_id) DO UPDATE
      SET version = EXCLUDED.version,
          snapshot = EXCLUDED.snapshot,
          created_at = EXCLUDED.created_at
    `, [
      snapshot.id,
      tenantId,
      snapshot.type,
      aggregate.version,
      JSON.stringify(snapshot.state),
      snapshot.createdAt,
    ]);
  }
  ```

* In `load()`, deserialize snapshot:

  ```ts
  if (snapshotResult.rowCount > 0) {
    const snapshotRow = snapshotResult.rows[0];
    fromVersion = snapshotRow.version;
    const AggregateClass = getAggregateClass(aggregateType);
    const instance = new AggregateClass(aggregateId);
    instance.applySnapshotState(snapshotRow.snapshot);
    instance.version = snapshotRow.version;
    ...
  }
  ```

---

#### `coreActivities.ts`

* Add:

  ```ts
  export async function snapshotAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
  ): Promise<void> {
    const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
    if (aggregate) {
      await eventStore.snapshotAggregate(tenantId, aggregate);
      console.log(`[snapshotAggregate] Snapshot taken for ${aggregateType}:${aggregateId}`);
    }
  }
  ```

---

#### `processCommand.ts`

* Track `appliesSinceLastSnapshot = 0` globally.

* Inside the `applyEvent` block:

  ```ts
  appliesSinceLastSnapshot++;

  if (appliesSinceLastSnapshot >= 2) {
    await snapshotAggregate(tenantId, aggregateType, aggregateId);
    appliesSinceLastSnapshot = 0;
  }
  ```

---

### Core Testing

* Core tests can still mock out `loadAggregate()` and snapshot state via `applySnapshotState()`.
* No need to simulate snapshot events.

---

Given your setup and desire for clean separation and testability within the **core**, the **more correct and flexible approach** is:

### Use `applySnapshotState()` directly in `load()`

**Why:**

* **Separation of concerns**:
  Snapshot loading is an infrastructure concern. The aggregate should not emit or consume a "snapshot event" unless the business logic explicitly defines that behavior.

* **Testing without DB**:
  By calling `applySnapshotState(snapshot)`, you decouple the reconstruction from the DB. Unit tests can inject snapshot state without needing to simulate a database or event list.

* **Avoids misuse of events**:
  A `SnapshotRestored` event would be redundant — it doesn't represent a business action, and you likely don’t want it polluting the event stream or being projected elsewhere.

* **Keeps domain deterministic**:
  The core’s logic remains deterministic and composable via methods like `.rehydrate()` or `.applySnapshotState()` without needing to "fake" snapshot events.

---

### Summary

| Option                                           | Pros                                                               | Cons                                                                                              |
|--------------------------------------------------| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| DO: call `applySnapshotState()` on aggregate     | ✅ Clean separation<br>✅ Easy unit testing<br>✅ No domain pollution | Slight infra-core boundary logic inside load                                                      |
| DONT: `apply({ type: 'SnapshotRestored', ... })` | Slightly uniform application pipeline                              | ❌ Misrepresents intent<br>❌ Ties core to infrastructure concerns<br>❌ Harder to test in isolation |
