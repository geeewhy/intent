## CURRENT SYSTEM OUTLOOK — May 30 2025

| Vertical Concern           | Current State / Design Choice | Tests / Tooling |
|----------------------------| ----------------------------- | --------------- |
| **Core Determinism**       | Aggregates rehydrate from event log; command handlers pure; side-effects only in activities | Unit tests on aggregates & invariants |
| **Ports / Hex Arch**       | Core depends only on ports (`EventStorePort`, `ReadModelUpdaterPort`, …); adapters live in `infra/` | Contract tests on ports; mock ports |
| **Vertical Slices**        | Each domain folder bundles aggregate, contracts, projections, sagas; infra adapters respect slice boundaries | Directory-convention lint; per-slice tests |
| **Command Routing**        | Typed Command → Workflow Router → Aggregate; idempotent insert + optimistic version check | Integration: multi-tenant ordering |
| **Auth / RLS**             | JWT → PG RLS; policy registry lives in domain repo, enforced in infra | Tests: empty-result vs denied |
| **Event Store**            | PostgreSQL append-only; snapshot every 10 events *(or 2 applies inside workflow)* | Snapshot-replay tests |
| **Projections**            | SQL-builder upserts; each table protected by generated RLS; per-projection Otel spans | Drift & RLS lint; projection-trace asserts |
| **Workflow Orchestration** | One long-lived workflow per aggregate; sagas for timers & cross-aggregate fan-out | E2E: `processCommand` / `processSaga` |
| **Observability**          | Correlation / causation / request IDs on every cmd → event → projection → saga hop; Otel spans emitted | Trace utilities; exporter TODO |
| **Schema Safety**          | Umzug migrations; drift scanner & selective checkpoint rewind (ADR 016) | CI job; repair script |
| **Resilience**             | Idempotent command insert, optimistic version check, workflow retries with jitter, snapshot roll-forward logic | Failure-path simulations |
| **Dev-X Tooling & CI/CD** | DevX-UI companion; in-mem event store; drift scanner → JSON/MD report → auto-repair; RLS linter; SQL migration planner; ADR & debt dashboards | CI pipeline matrix: lint → unit → integration → drift-scan *(fail-fast)*; optional `repair` stage; local Jest watch |
| **Upcasting Strategy**            | Enable schema evolution for historical event compatibility with clearly defined migration tests.       | integration tests for upcasting logic; snapshot tests for event schema changes. |

---

### Highlights

* **DevEx infra bootstrap**

  * Consistent CLI for setting up event store, scheduler, projections, etc.
  * Works in both CI and local interactive mode
  * No manual script editing - pick a flow and run
  * New environments and providers can be added without touching core logic
  * Clear test feedback if steps misconfigured or incomplete

* **Workflow-first execution model**
    - Commands enter through a workflow engine, giving exactly-once delivery, back-pressure, and durable retries.  
      Axon/Lagom rely on brokers and manual sagas; most Node kits run in-process buses.

* **Snapshot & upcasting strategy codified (ADRs 007–010)**
    - Cadence, versioning, and rollback rules are version-controlled, not ad-hoc.

* **Multi-tenant first**
    * Isolation at infra level with shared-core models**
    * Tenant ID propagates edge → DB → workflow queue; RLS and queue sharding prevent cross-tenant leakage.
    * All tenants share identical domain rules, a single event stream is safe; if divergence ever appears, ports allow migrating a tenant to its own store without touching core logic.

* **Automated RLS generation + lint**
    * Projection definitions express access rules once; a generator converts them into deterministic SQL RLS policies—no hand-written GRANT files to drift.
    * **Policy-first separation** – Core code states *what* each role/tenant may read; infra code handles *how*. This keeps aggregates and projections free of interface-level bindings to core.
    * **Least-privilege by default** – each consumer sees only rows they own, essential when a single event log fans out to multi-tenant projections.
    * **Replay-safe** – during checkpoint rewind or full rebuild, the same policies are reapplied automatically, blocking leaks in transitional states.
    * Linter step fails the CI pipeline if any projection lacks a policy or references an undefined role, so “temporary” insecure tables never reach main.

* **Drift-aware projection repair**
    - `scan → plan → repair` rewinds only to the last safe checkpoint—avoids full rebuilds common in other stacks.

* **Tooling & CI/CD pipeline**
  * **Drift scanner + auto-repair** – `scanner` diff-checks projection schema vs. event history, emitting a JSON/Markdown report.  
    The `repair` script consumes that report to rewind checkpoints and backfill events; gated behind an explicit CI stage.
  * **RLS rule linter** – validates that every `SystemAccessCondition` maps to at least one PG policy; pipeline fails on gaps.
  * **SQL migration planner** – static-analyses raw SQL files, orders them safely, and feeds Umzug; identical across environments.
  * **DevX-UI productivity loop** – The DevX-UI companion provides a command issuer to test flows, event stream viewer with filtering, trace viewer, and system metrics panel; accelerates local debugging.
  * **ADR & debt dashboards** – Markdown ADRs and `docs/debt.md` surface in pull-request checks, keeping architecture and TODOs visible.
  * **CI matrix** – Pipeline runs lint → unit → integration → drift-scan; the same scripts run locally via `npm run test:watch`, ensuring laptop-to-pipeline parity.

* **End-to-end observability as a first-thought**
    * **Span coverage** – OpenTelemetry spans wrap every hop: CLI/HTTP → command dispatch → event append → workflow execution → projection upsert → saga output.
    * **Causation & correlation IDs** – IDs travel with metadata through the entire pipeline, letting trace tools stitch a full tree: originating request, each command, derived events, sagas, and downstream commands.
    * **Event-sourced replay insight** – When a projection rewinds, emitted spans include the original event timestamp vs. replay timestamp, so dashboards can differentiate live flow from catch-up.

* **Failure-path instrumentation**
    * CI exercises rate-limits, retries, and compensation flows, not just happy paths.

Goals:
* Emphasise determinism and explicit boundaries
* Provide automated safety nets over abstraction layers
* Stand as a **working reference implementation**, not a starter scaffold
