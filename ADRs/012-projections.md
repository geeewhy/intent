# ADR-012: Projection Layer — Modular, Slice-Owned, Temporal-Executed

**Postgres-backed | Temporal-driven | Slice-oriented | Pure core | No Supabase dependency**

---

## Purpose

* Materialize domain events into Postgres-backed read models
* Keep all projection logic slice-local and pure (`core/` only defines handlers)
* Execute projections inside Temporal activities for retryability, traceability, and isolation
* Dynamically load slice handlers to enable modularity and clean separation
* Manage schema evolution per slice with migration folders via Umzug

---

## CHANGES TO MAKE

---

### 1. **Treat Projections as Slice-Owned Components**

**Why**: Projections are part of a slice's query model. Centralizing them breaks vertical ownership and violates DCB.

**Change**: Move projections from `core/order/projections` → `core/order/read-models`.

Example:

```
core/system/read-models/
├── migrations/
│   └── 001_init_system_status.sql
├── register.ts                          // Exports system projection handlers
└── system-status.projection.ts         // Implements projection logic for TEST_EXECUTED
```

---

### 2. **Decouple `projectEvents()` from Static Imports**

**Why**: Avoid tightly bound projection registries and enable flexible runtime slice inclusion.

**Change**:
Replace static imports with dynamic slice resolution.

```ts
// src/infra/projections/loadProjections.ts
export async function loadAllProjections(pool: DatabasePool): Promise<EventHandler[]> {
  const slices = await Promise.all([
    import('../../core/system/read-models/register').then(r => r.registerSystemProjections(pool)),
    // future slices here
  ]);
  return slices.flat();
}
```

---

### 3. **Avoid Central `ReadModelUpdaterPort` Registry**

**Why**: Prevents tight coupling between projection logic and global infra.

**Change**:
Each slice creates its own adapter using Slonik:

```ts
// core/system/read-models/register.ts
import { createSystemStatusProjection } from './system-status.projection';
export function registerSystemProjections(pool: DatabasePool): EventHandler[] {
  const updater = createPgUpdaterFor('system_status', pool);
  return [createSystemStatusProjection(updater)];
}
```

---

### 4. **Integrate with Tracing + Observability**

**Why**: You already track correlation and causation. Tracing projection executions aids debugging and root-cause analysis.

**Change**:
Wrap each handler in `trace()`, helpers for tracing is in src/core/shared/observability.ts

```ts
await trace(`projection.handle.${event.type}`, { event }, async () => {
  await handler.handle(event);
});
```

---

### 5. **Future-proof with Projection Failover Strategy**

**Why**: Projections should never crash workflows. You must log failures, but continue execution.

**Change**:

```ts
try {
  await trace(..., async () => await handler.handle(event));
} catch (err) {
  log.warn('Projection failed', { eventType: event.type, error: err });
  // optionally: await recordProjectionFailure(event, err);
}
```

---

## Temporal Integration

**Activity Entry:**

```ts
// src/infra/projections/projectEvents.ts
export async function projectEvents(events: Event[]): Promise<void> {
  const handlers = await loadAllProjections(pool);

  for (const event of events) {
    for (const handler of handlers) {
      if (!handler.supportsEvent(event)) continue;
      try {
        await trace(..., async () => await handler.handle(event));
      } catch (err) {
        log.warn('Projection failed', { event, error: err });
      }
    }
  }
}
```

**Wiring into `coreActivities.ts`:**

```ts
// src/infra/temporal/activities/coreActivities.ts
export { projectEvents as projectEventsActivity } from '../../../infra/projections/projectEvents';
```

**Workflow usage:**

```ts
// src/infra/temporal/workflows/processCommand.ts
function processCommand () {
//...
    await applyEvents(/*...*/);
    await projectEventsActivity(events);
//...
}
```

---

## Read Model + Migration Example

**SQL:**

```sql
CREATE TABLE system_status (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  testName TEXT,
  result TEXT,
  executedAt TIMESTAMP,
  parameters JSONB,
  numberExecutedTests INTEGER,
  updated_at TIMESTAMP
);
```

**Migration location:**

```
core/system/read-models/migrations/001_init_system_status.sql
```

## 9. Umzug-Based Migration Loader (infra/migrations/runMigrations.ts)

```ts
import { Umzug } from 'umzug';
import { globSync } from 'glob';
import { createPool } from './pg-pool';

const pool = createPool();

const migrationDirs = globSync('core/**/projections/migrations');

for (const dir of migrationDirs) {
const umzug = new Umzug({
migrations: { glob: `${dir}/*.sql` },
context: pool,
storage: new UmzugPostgresStorage({ pool, tableName: 'migrations' }),
logger: console,
});

await umzug.up();
}
```
* Run in CI, dev boot, or worker init
* Use .pending() for CI drift detection

We should have a migration npm run script that runs all migrations in order with uzmuk cli.

---

## Directory Structure Additions

```
src/
├── core/
│   └── system/
│       └── read-models/
│           ├── migrations/
│           │   └── 001_init_system_status.sql
│           ├── register.ts
│           └── system-status.projection.ts
├── infra/
│   └── projections/
│       ├── projectEvents.ts
│       └── loadProjections.ts
├── infra/
│   └── temporal/
│       └── activities/
│           └── coreActivities.ts  // projectEventsActivity lives here
```

---

## TL;DR: Prioritized Deltas

| Priority | Change                                                  | Why                             |
| -------- | ------------------------------------------------------- | ------------------------------- |
| High     | Move projections into slices under `read-models/`       | Vertical ownership, modular DCB |
| High     | Use dynamic slice-based loading for projection handlers | Lazy resolution, hot-deployable |
| Medium   | Create per-slice `ReadModelUpdaterPort` instances       | Avoid central coupling          |
| Medium   | Trace and log each projection handler execution         | Observability, debugging        |
| Optional | Log and recover gracefully from handler failures        | Workflow stability, resilience  |

# Testing

## Test Coverage and Strategy

### Goals

* Ensure **projection correctness**: the right read model is created or updated for a given event
* Guarantee **slice isolation**: projections behave independently of infrastructure
* Validate **side-effect boundaries**: core projection logic must not leak dependencies
* Simulate **failure scenarios**: ensure projections don’t crash workflows and fail gracefully
* Track **behavior regressions** during event or schema evolution

---

### Unit Tests (Pure Handler Logic)

**What to test**: Projection behavior given an input event and a mock updater

**Approach**:

* Use `createMockUpdater()` to capture upserts/removals
* Validate output shape, ID, tenant handling, and idempotency where applicable

**Example**:
`src/core/system/__tests__/system-status.projection.test.ts`

```ts
import { createSystemStatusProjection } from '../read-models/system-status.projection';
import { createMockUpdater } from '../../../utils/test-utils';
import { SystemEventType } from '../contracts';

test('creates a status row for TEST_EXECUTED', async () => {
  const mock = createMockUpdater();
  const handler = createSystemStatusProjection(mock);
  const event = {
    type: SystemEventType.TEST_EXECUTED,
    tenant_id: 'tenant-1',
    aggregateId: 'system-123',
    version: 1,
    payload: {
      systemId: 'system-123',
      testName: 'health-check',
      result: 'success',
      executedAt: new Date(),
      numberExecutedTests: 1,
      parameters: { run: true }
    },
    metadata: { timestamp: new Date() }
  };

  expect(handler.supportsEvent(event)).toBe(true);
  await handler.handle(event);

  expect(mock.store.get('system-123')).toMatchObject({
    testName: 'health-check',
    result: 'success',
    tenant_id: 'tenant-1',
    numberExecutedTests: 1
  });
});
```

### Integration Tests (Temporal Activity and Workflow)

**What to test**: That the `projectEventsActivity()` correctly triggers projection logic and does not crash workflows on failure.

**Approach**:

* Run end-to-end flow: dispatch command → emit event → call `projectEventsActivity()`
* Use in-memory Postgres/test DB with a real `ReadModelUpdaterPort`
* Spy on `handle()` methods and verify projections executed or skipped

**Example Test File**:
`src/infra/integration-tests/projection.integration.test.ts`

**Test Cases**:

* [x] Events routed to correct handler
* [x] Handler updates the DB
* [x] Failing handler logs error and continues
* [x] Unknown event types are ignored

---

### Regression & Drift Detection

**Check for**:

* Contract mismatch between event payloads and projections
* Migration drift using Umzug’s `.pending()` check
* Snapshots vs. projections desync on aggregate evolution

---

### Test Utility Scaffold

**File**: `src/core/shared/test-utils.ts`

```ts
export function createMockUpdater(): ReadModelUpdaterPort<any> {
  const store = new Map();
  return {
    async upsert(_, id, data) { store.set(id, data); },
    async remove(_, id) { store.delete(id); },
    store,
  };
}
```

## Summary Table

| Test Type        | Scope                         | Tooling                   | Assert                             |
| ---------------- | ----------------------------- | ------------------------- | ---------------------------------- |
| Unit Test        | Projection logic only         | Mock updater              | Output shape, conditions, ID logic |
| Integration Test | Workflow + activity scope     | Postgres/Temporal + spies | Handler triggered, state persisted |
| Drift Detection  | Migration + contract coverage | Umzug CI + typecheck      | Projection-table sync              |
| Failure Scenario | Graceful degradation          | Mocks + log spy           | Log error, workflow survives       |
