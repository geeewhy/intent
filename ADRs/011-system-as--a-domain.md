# ADR-011: `SystemAggregate` – Infrastructure-Safe Internal Testing Domain

## What

Introduce a dedicated `SystemAggregate` used solely for infrastructure and workflow behavior testing. It enables controlled simulation of domain behaviors such as retries, event emission, and aggregate lifecycle without polluting production logic. `SystemAggregate` is a pure core-domain module that runs inside real workflows and event stores, validating Temporal, event sourcing, and fan-out infrastructure under load and fault conditions.

## Why

The system needs a stable mechanism for testing domain behaviors under real runtime conditions -- without interfering with business aggregates. `SystemAggregate` isolates test logic into a dedicated domain, providing stateful event emission, snapshot verification, and controlled failure paths. This supports CI pipelines, regression testing, and infrastructure validation using the actual event/command infrastructure. It also allows safe evolution of retry logic, projection fan-out, and saga orchestration.

## Implications

* A dedicated internal domain (`/core/system`) exists to simulate domain workflows and state transitions.
* All logic is deterministic and infrastructure-agnostic. No special event types or projections are required.
* The aggregate:

    * Emits synthetic events
    * Tracks state (`numberExecutedTests`, `version`)
    * Triggers retryable errors on even versions
* Snapshots can be generated and validated by running real workflows.
* `SystemAggregate` and its `systemSaga` provide reusable scaffolds for testing event-command fanout and saga auto-reactions.
* The domain is safely testable with the in-memory or Postgres event store and Temporal orchestration.
* No production commands or events are used -- ensures hard safety boundaries for test logic.

## How

* Define contracts for `SystemCommand` and `SystemEvent` covering a wide set of test scenarios (`logMessage`, `simulateFailure`, `executeTest`, etc.).
* Implement `SystemAggregate` with:

    * Internal version tracking
    * Controlled retry failure on even versions
    * Multi-event emission for replay/fanout scenarios
* Implement `systemSaga` to auto-dispatch based on synthetic event contents.
* Register access control logic via `access.ts` and policy registry.
* Reuse core bootstrapping and saga orchestration via the existing `processCommand` and `processSaga` workflows.
* Write regression and CI-focused tests under `core/system/__tests__/`.

## Alternatives Considered

* Using `OrderAggregate` or business aggregates for retry testing: rejected to avoid polluting production logic and state.
* Creating one-off workflow tests with mocked commands: rejected for lack of infrastructure realism.
* Custom testing mode toggles in aggregates: rejected to avoid hard-coded test logic in domain.

## Result

A clean, infrastructure-safe `SystemAggregate` is available for simulating stateful domain transitions, emitting multi-event chains, triggering retry scenarios, and driving deterministic infrastructure testing. The domain lives in `core/system/` and runs through the same workflows, activities, and event store used by production aggregates. Tests verify snapshotting, versioning, Temporal retry behavior, and saga reactivity without affecting business state. The system now has a hardened test substrate embedded in the real runtime.
