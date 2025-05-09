# ADR-009: Migration Plan: From Embedded Snapshot in `load()` → Separate `loadSnapshot()` + `load()`

---

#### 1. **Refactor `PgEventStore.load()`**

**Old behavior**:

* Looked up snapshot and loaded+applied events after it

**New behavior**:

* Becomes a **pure event loader**, given a `fromVersion`

```ts
async load(tenantId: UUID, aggregateType: string, aggregateId: UUID, fromVersion = 0)
```

*Plan*:

* Extract snapshot logic into a new method
* Retain event loading logic, accepting `fromVersion` param

---

#### 2. **Extract `loadSnapshot()` from old `load()`**

Move this logic:

```ts
const snapshotResult = await client.query(`
  SELECT version, snapshot
  FROM aggregates
  WHERE ...
`)
```

Into:

```ts
async loadSnapshot(tenantId, aggregateType, aggregateId): Promise<{ version, state } | null>
```

---

#### 3. **Refactor `coreActivities.loadAggregate()`**

**Old behavior**:

* Call `eventStore.load(...)` → returns events + version
* Aggregate rehydrates internally (snapshot logic buried)

*New behavior*:

```ts
const snapshot = await eventStore.loadSnapshot(...)
aggregate.applySnapshotState(snapshot.state)
aggregate.version = snapshot.version

const events = await eventStore.load(..., snapshot.version)
aggregate.apply(...)
```

*This now composes from two infra calls rather than one mixed one.*

---

#### 4. **Audit Temporal Activities**

* Ensure only `loadAggregate()` is affected (e.g. `executeCommand`, `applyEvent`)
* No other logic should call `eventStore.load()` expecting snapshot application

---

#### 5. **Clean Up & Deprecate Embedded Logic**

* Remove snapshot logic from `PgEventStore.load()`
