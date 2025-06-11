# ADR-022: **Local Side-panel Dev-X Companion**

## 1 Context

* The platform uses a ports-first, event-sourced architecture. Commands and events are routed through the same deterministic workflows used in production.
* Developers previously relied on disparate tools (shell, `psql`, Temporal Web UI, Jaeger) to understand or simulate system behavior.
* Postgres `LISTEN` channels (`new_event`, `new_command`) already feed into the local Temporal workers and projections.
* Devs requested a unified, **local-first** DevEx console that enables:

    1. Inspection, validation, and emission of commands/events
    2. Viewing projection and trace state in real-time
    3. Structured AI-assisted scaffolding (types, sagas, events, projections)
    4. Replay/debug capabilities from the event log
* The UI must reflect actual runtime constraints: multi-tenant, role-restricted command access, and full audit of side effects.

---

## 2-Decision

### 2.1 High-Level View

```
┌─────────────┐
│ DevEx UI SPA│  ← Tabs: Commands | Events | Traces | Replay | Projections | AI
└─────┬───────┘
      │ REST + SSE/WS
┌─────▼──────────────┐
│ /api (ports-only)  │ ← no direct DB access; calls EventStorePort, SagaRegistry, etc.
│ + /api/ai-proxy    │ ← calls LLM with scoped context
└─────┬──────────────┘
      │
┌─────▼────────────┐
│ Postgres LISTEN  │ ← streams new_command + new_event (if WS)
└─────┬────────────┘
      ▼
 ┌──────────────┐
 │ AI + CLI     │ ← Generates `.patch` files for types & handlers (later ADR)
 └──────────────┘
```

---

### 2.2 Detailed Design Points

| Aspect                | Decision                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**          | SPA under `src/devex-ui/`; includes tabs for Commands, Events, Projections, Traces, Aggregates, Rewind, AI.                                                                    |
| **Command issuer**    | Fully type-aware with schema-based form generation. Role dropdown adapts dynamically to selected command domain, ensuring only valid roles appear.                             |
| **Role validation**   | If selected role isn’t part of the domain's available roles, it is reset; the role selector UI reflects this with dynamic placeholders (“Select a role” or “Roles populate…”). |
| **Registry source**   | `commandRegistry`, `rolesStore`, `eventRegistry`, `projectionRegistry`, `sagaRegistry` are exported from `core/registry.ts`; no hardcoded lists outside source-of-truth.       |
| **Backend façade**    | `/api/*` routes use ports only (never call DB/Temporal directly). AI and scaffolding features run isolated from runtime mutations.                                             |
| **AI Assist**         | `/api/ai-proxy` sends scoped context (selected domain/contract/slice) to LLM. Scaffold output includes `.patch` files only, with no auto-commit.                               |
| **Replay + simulate** | Event streams are replayed against in-memory aggregates; what-if diffs are computed and shown as JSON state patches.                                                           |
| **Security**          | No JWT in local mode; RLS still enforced if using a remote DB.                                                                                                                 |
| **CLI parity**        | `devx ui` launches the SPA using same `.env` as CLI + workers.                                                                                                                 |

---

## 3-Behavior Summary

### Commands Tab

* Shows all available commands grouped by domain
* Selecting a command shows schema-driven form and available roles (from `useRoles(domain)`)
* Role selector resets if invalid; UI shows context-aware placeholder
* On submission, command is POSTed to `/api/commands`, processed via normal ports
* After dispatch, the corresponding trace is auto-expanded via correlation ID

### AI Side-panel

* **Chat Mode**: query behavior/state over event stream or aggregate
* **Scaffold Mode**: wizard to generate new commands/events/sagas/types
* **Simulator Mode**: run a hypothetical event chain through a rehydrated aggregate and preview resulting state diff

---

## 4-Consequences

|                             | Positive                                                                                   | Trade-offs / Mitigations                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Unified DevEx dashboard** | Full visibility into all domain slices, including real-time traces, without context switch | WebSocket LISTEN loop may become noisy → supports throttle env var in `.env`             |
| **Determinism preserved**   | All command submissions flow through existing routing and validation                       | Incomplete schema = validation failure; schema coverage enforced at registry level       |
| **Safe scaffolding**        | `.patch` files are generated but not committed                                             | Prevents unsafe auto-writes; CI ensures schema + unit coverage post-patch                |
| **Zero infra requirement**  | Works with docker-compose stack + local Postgres                                           | If pointing to shared DB, advise dev pods only run LISTEN to avoid shared fan-out noise  |
| **Context-aware UI**        | Domain → Roles → Payload schema chaining enforced in UI                                    | Role edge cases must be handled when registry mismatches occur (e.g. outdated role list) |

---

## 5-Rejected Alternatives

| Option                   | Reason for Rejection                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Full Electron App        | Unnecessary packaging overhead; SPA already integrates cleanly with CLI and local stack |
| Retool / External Studio | Breaks invariants, bypasses RLS and command auditing                                    |
| Auto Git Commits         | All scaffolds must be reviewed; early .patch outputs are often exploratory              |

---

## Future Considerations

1. Add `useRoles(domain)` + auto-reset logic into CommandIssuer UI
2. Wire WS/SSE `/api/stream/commands` and `/api/stream/events` to feed DevEx console tabs
3. Enable `.patch` output from scaffold mode and render diff preview before saving...AI scaffolding begs for its own ADR
4. Add in-memory replay of event chains into “What-if Simulator” tab...begs for its own ADR
