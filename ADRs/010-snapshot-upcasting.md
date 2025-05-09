## ADR-010: Snapshot Schema Versioning – Implementation Plan

### Goal

* Support versioned snapshots in the `aggregates` table
* Allow aggregates to **migrate old snapshots** during `applySnapshotState()`
* Keep all logic **testable, pure, and core-side**
* Avoid breaking existing aggregates

---

### Step-by-Step Plan

---

### 1. **Update `Snapshot<T>` interface in `contracts.ts`**

```ts
export interface Snapshot<T = any> {
  id: UUID;
  type: string;
  state: T;
  createdAt: string;
  schemaVersion: number; // <-- new
}
```

---

### 2. **Update `BaseAggregate` to handle versioned snapshots**

Refactor the base class as follows:

```ts
export abstract class BaseAggregate<TState> {
  abstract aggregateType: string;
  version = 0;

  constructor(public id: UUID) {}

  // Schema versioning
  static CURRENT_SCHEMA_VERSION = 1;

  // Default is identity (can override in subclass)
  protected upcastSnapshotState?(raw: any, version: number): TState {
    return raw;
  }

  applySnapshotState(raw: any, incomingVersion?: number): void {
    const targetVersion = (this.constructor as any).CURRENT_SCHEMA_VERSION;
    const inputVersion = incomingVersion ?? targetVersion;

    const upcasted = this.upcastSnapshotState
      ? this.upcastSnapshotState(raw, inputVersion)
      : raw;

    this.applyUpcastedSnapshot(upcasted);
  }

  protected abstract applyUpcastedSnapshot(state: TState): void;

  toSnapshot(): Snapshot<TState> {
    return {
      id: this.id,
      type: this.aggregateType,
      state: this.extractSnapshotState(),
      createdAt: new Date().toISOString(),
      schemaVersion: (this.constructor as any).CURRENT_SCHEMA_VERSION,
    };
  }

  abstract extractSnapshotState(): TState;
  abstract apply(event: Event<any>): void;
}
```

---

### 3. **Update `PgEventStore.loadSnapshot()` to read `schemaVersion`**

```ts
async loadSnapshot(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ version: number, state: any, schemaVersion: number } | null> {
  const client = await this.pool.connect();
  try {
    await this.setTenantContext(client, tenantId);
    const result = await client.query(`
      SELECT version, snapshot, schema_version
      FROM aggregates
      WHERE tenant_id = $1 AND id = $2 AND type = $3
    `, [tenantId, aggregateId, aggregateType]);

    if (result.rowCount === 0) return null;

    return {
      version: result.rows[0].version,
      state: result.rows[0].snapshot,
      schemaVersion: result.rows[0].schema_version ?? 1,
    };
  } finally {
    client.release();
  }
}
```

---

### 4. **Update `loadAggregate()` activity**

```ts
const snapshot = await eventStore.loadSnapshot(...);

if (snapshot) {
  aggregate.version = snapshot.version;
  aggregate.applySnapshotState(snapshot.state, snapshot.schemaVersion);
}
```

---

### 5. **Implement upcast logic per aggregate (optional override)**

```ts
export class OrderAggregate extends BaseAggregate<OrderSnapshot> {
  static CURRENT_SCHEMA_VERSION = 2;

  protected upcastSnapshotState(raw: any, version: number): OrderSnapshot {
    if (version === 1) {
      return {
        ...raw,
        deliveryMode: 'pickup', // default for v2
      };
    }
    return raw;
  }

  protected applyUpcastedSnapshot(state: OrderSnapshot): void {
    this.status = state.status;
    this.items = state.items;
    this.deliveryMode = state.deliveryMode;
  }
}
```

---

### 6. **Assume DB changes are there: `schema_version` added to `aggregates` table**

New DDL is:
```sql
CREATE TABLE "public"."aggregates" (
                                       "tenant_id" uuid NOT NULL,
                                       "id" uuid NOT NULL,
                                       "type" text COLLATE "pg_catalog"."default" NOT NULL,
                                       "snapshot" jsonb NOT NULL,
                                       "version" int4 NOT NULL,
                                       "updated_at" timestamptz(6) DEFAULT now(),
                                       "created_at" timestamptz(6),
                                       "schema_version" int2 NOT NULL DEFAULT 1,
                                       CONSTRAINT "aggregates_pkey" PRIMARY KEY ("tenant_id", "id")
)
;

ALTER TABLE "public"."aggregates"
    OWNER TO "postgres";
```

---

### Result

* Snapshots are safely upcasted to the latest version before being applied.
* Core aggregates stay decoupled from persistence details.
* New versions can evolve without corrupting legacy data.
* Tested in src/core/base/__tests__/aggregate.test.ts