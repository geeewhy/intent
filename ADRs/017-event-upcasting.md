# ADR-017: Event Upcasting Strategy

## 1. Context

* Events are immutable but evolve; new fields or structural changes must not break replay of historical streams.
* We already store `schemaVersion` in `event.metadata`.
* Snapshots handle their own upcasting via `applySnapshotState`; we need an equivalent mechanism for **events** during rehydration.

## 2. Decision

### 2.1 Upcaster Registry

```ts
type UpcasterFn = (payload: any) => any;

interface Registry {
  [eventType: string]: { [fromVersion: number]: UpcasterFn };
}

export const eventUpcasters: Registry = {};

export function registerEventUpcaster(
  type: string,
  fromVersion: number,
  fn: UpcasterFn
) {
  eventUpcasters[type] ??= {};
  eventUpcasters[type][fromVersion] = fn;
}
```

* Upcasters are pure functions, registered at module-load time.
* Duplicate registrations throw during CI tests.

### 2.2 Application on Load

In `PgEventStore.load()` each event row is transformed:

```ts
const schemaVersion = row.metadata.schemaVersion ?? 1;
const payload      = upcastEvent(row.type, row.payload, schemaVersion);
```

`upcastEvent` looks up the registry and applies at most **one** hop (vN ➜ vN+1). Chained upgrades are done by registering successive functions.

### 2.3 Contract

* **Backwards-compatibility:** Writers always emit the *latest* `schemaVersion`.
* **Readers:** Transparently consume any prior version present in storage.
* **Version bump policy:**

    1. Add new code that reads both old & new fields.
    2. Deploy an upcaster + bump `schemaVersion` constant.
    3. Update writers to emit the new shape.

### 2.4 Observability

| Span name              | When emitted                                                                               | Key attributes                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **`event.upcast`**     | Every time an event payload is transformed by `upcastEvent()` inside `PgEventStore.load()` | `event_type` · `from_version` · `to_version` · `aggregate_id` |
| **`snapshot.persist`** | Inside `PgEventStore.append()` when we write a snapshot                                    | `aggregate_type` · `aggregate_id` · `version` · `bytes`       |
| **`snapshot.restore`** | When a snapshot is loaded via `loadSnapshot()`                                             | same as above                                                 |


## 3. Consequences

| Positive                                                                                                                         | Negative                                                                                                   |
|----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Centralised, testable migration logic; no brittle switch-cases in aggregates.                                                    | Upcasting happens every replay; heavy transforms could add latency (mitigated by snapshots).               |
| Allows gradual roll-out: old producers keep working, new code reads both.                                                        | Registry must be kept in sync with event deletions; CI will fail if an upcaster references a removed type. |
| Pure functions -> easy unit tests (see `event-upcaster.test.ts`).                                                                | Chained upcasts can be verbose for long-lived domains; consider generating squash migrations later.        |
| **Aggregates stay schema-agnostic.** All upcasting is handled in the persistence **port**; domain code never sees legacy shapes. | See alternatives                                                                                           |

## 4. Alternatives Considered

1. **Multiple event topics / tables per version** – rejected.
2. **Writer-side history rewrite** – then what's the point of ES.
3. **Upcasting directly inside aggregates** (apply/constructor loads detect old payloads)  
   *Pros*: no extra infra.  
   *Cons*: pollutes every aggregate with version branches; impossible to remove once in place; violates SRP.  
   *Decision*: keep aggregates clean; centralise in the port.
4. **Upcasting in the Event Bus layer** (after load but before dispatch to projections/workflows)  
   *Pros*: bus already touches every event.
   *Cons*: aggregates and bus may diverge; replay tests that bypass the bus (unit tests, CLI replays) would still need the logic; two hotspots instead of one. souce of truth of the events is the event store, not the bus.
   *Decision*: port-level is the single choke-point every reader uses (aggregates, projections, repair jobs), so we upcast there.
