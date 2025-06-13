# ADR-003: Domain Core Services and Temporal Wiring

## What

Refactor the command-processing pipeline to route all commands through Temporal workflows. Remove per-command job scheduling logic. Business rules remain entirely in the domain core (`src/domain`), while Temporal workflows handle orchestration and delay. Side-effects are implemented as activities. This unifies sync and async command handling behind a single durable, replayable path.

## Why

The previous architecture used an explicit `requiresJob` flag and conditional logic to determine when to schedule workflows. This introduced complexity and fragmented responsibility between command ingress, scheduling, and domain logic. By routing all commands through Temporal workflows, the system becomes consistent, observable, and fault-tolerant by default—while domain logic remains clean and framework-independent.

## Implications

* All commands go through Temporal, even those previously handled synchronously.
* `requiresJob` logic and flags are removed.
* Domain core no longer depends on `JobSchedulerPort`.
* Temporal workflows do not contain business rules, only orchestration logic.
* Activities encapsulate all side-effects (publishing, status updates, notifications).
* Workflow code must use Temporal SDK utilities (e.g., `sleep`, `now`) for determinism.
* Worker code must split workflow and activity contexts cleanly.
* Activities must manage connections as singletons to prevent overhead.
* Workflow return values must be minimized to reduce history payload size.

## How

* Commands are inserted via Edge Function and trigger `pg_notify`.
* Command pump listens and starts or signals a workflow using `tenantId + cmd.id`.
* Workflow loads aggregate, dispatches to domain service, persists and publishes events via activities.
* Activities live in `order.activities.ts`, workflows in `order.workflows.ts`.
* Use `proxyActivities()` to bind activities in workflow context; avoid direct imports.
* Replace `setTimeout` and native Date usage with `sleep()` and `now()` from Temporal SDK.
* Minimize `return` payloads from workflows.
* Rename or eliminate wrapper workflows to reduce indirection.
* In activities, initialize Supabase client once and reuse it.
* Test by issuing commands and asserting on event emissions from in-memory ports.

## Alternatives Considered

* Continue routing only "async" commands through workflows: rejected due to branching complexity and fragility.
* Direct side-effect execution inside workflows: rejected to preserve domain-core purity and testability.
* Using one workflow per aggregate instead of per command: rejected to preserve idempotence and traceability.
* Retaining `requiresJob` as a hint: rejected in favor of unconditional workflow entry for all commands.

## Result

All commands are routed through Temporal workflows. Application layer (`OrderService`) is pure, port-based, and testable without workflow context. Activities encapsulate all infrastructure calls. Workflow code is deterministic and safe for replay. Testing scaffold for core logic uses in-memory ports. System behavior is observable, replayable, and tenant-isolated via deterministic ID prefixing.
