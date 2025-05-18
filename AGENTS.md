# AGENTS.md

## 🎯 Purpose

This file defines system instructions for AI-based agents (e.g. Codex, Copilot PR bots) operating in this codebase. It enforces architectural rules, behavior contracts, and change management required to evolve this project into a reusable ES/DDD framework with Temporal integration.

### GROUND RULES

* DO NOT RUN ANY INTERNET SEARCHES OR EXTERNAL API CALLS
* DO NOT TRY TO INSTALL ANY DEPENDENCIES YOU DO NOT HAVE INTERNET ACCESS TO INSTALL

---

## 🔍 Scope

* Governs all files in this repo unless overridden by nested `AGENTS.md`.
* Applies to any code generation, commit construction, PR creation, or structural modification by automated agents.
* Explicit user prompts override this file temporarily.

---

## ✅ Commit & PR Rules

### Commit Format

All commits must follow this style:

```text
feat: add support for system commands and enhance dispatching

src/infra/integration-tests/commands.test.ts: Updated tests to handle system commands and removed userId prefix for better consistency.
src/core/domains.ts: Introduced `getCommandBus` to centralize command handling logic and register domain-specific handlers.
...
```

**Rules**:

* Use a lowercase, imperative **type prefix**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
* First line is a short summary (\~72 chars max).
* Body is a bullet-point diff grouped by file, summarizing intent — not diffs.
* Refer to full path (`src/...`) and describe behavioral impact.

---

## 🧱 Toolkit Development Constraints

This repo is entering a framework phase. Follow these:

| Category            | Rule                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Modularity**      | New features must be encapsulated as reusable patterns: ports, adapters, workflows, sagas, policies, projections. |
| **Slice-first**     | All logic must belong to a domain slice (e.g. `system`, `order`). No shared `utils/` dumping.                     |
| **Port purity**     | Ports must define clean contracts — do not include implementation details or references to infra.                 |
| **Activity safety** | Activities must be testable, idempotent, and operate on full inputs. No global context dependency allowed.        |
| **Event flow**      | Only `aggregate.handle()` emits events. All commands flow through a handler or bus.                               |
| **Snapshotting**    | Must comply with ADRs 008–010: version-aware, upcast-ready, stored under `infra/pg/pg-event-store.ts`.            |
| **RLS-ready**       | All projections must assume Supabase row-level security. No broad read models without filters.                    |

---

## 🧪 Required Test Coverage

All code changes must trigger the following checks:

```bash
npm run build
npm run test
npm run test:core
```

DO NOT RUN:
```
npm run test:integration
npm run migration:projections
```

Additionally:

* If adding projection logic: include an integration test under `infra/integration-tests/`.
* If modifying `processCommand` or `processSaga` workflows: include signal tests under `infra/integration-tests/`.
* If modifying `EventStorePort` or snapshot logic: assert replay correctness via `snapshots.test.ts`.

---

## ⛔ Must NOT Do

* ❌ Bypass `EventStorePort` for appending or reading events.
* ❌ Publish or handle events outside of `event-bus` or aggregate workflows.
* ❌ Introduce Temporal logic directly in `core/` — no `@temporalio/*` imports there.
* ❌ Share logic between domains unless explicitly abstracted as a port/adapter.
* ❌ Introduce uncontrolled time or randomness in core logic (`Date.now()`, `uuid()` directly in aggregates).

---

## 🧭 Workflow & Usage

### To Add New Domain Feature

1. Create domain slice: `src/core/<domain>`
2. Define:

    * `contracts.ts`: `Command`, `Event`, `Metadata`
    * `aggregates/`: logic with `apply()` and `handle()`
    * `sagas/`: orchestration logic
    * `read-models/`: projections and RLS rules
    * `index.ts`: export slice interface
3. Register in:

    * `domains.ts`
    * `workflow-router.ts`
    * `policy-registry.ts` (if using RBAC)
4. Add tests in `infra/integration-tests/`
5. Validate with all `npm run ...` checks

---

## 🤖 Agent Notes

If unsure:

* Use `// AGENT_NOTE:` comments to highlight uncertainty.
* Prefer proposing a minimal working change with file-scoped commits.
* Avoid batching unrelated modules in one commit.
* Ask for explicit architectural confirmation if modifying:

    * `core/ports.ts`
    * `workflow-router.ts`
