### 🧱 **CURRENT SYSTEM OUTLOOK**

**(in short: not just “event-driven” in the README — it actually *does* stuff)**

#### 1. **Event-Sourced Core**

* The system models domain behavior through commands and events, using rich metadata for causality, correlation, and trace context.
* Aggregates rehydrate from event history and handle commands through pure, deterministic logic.
* Contracts define strong typing and shape guarantees — composable, intentional, and not something that mutated during a product demo.

#### 2. **Temporal Workflow Runtime**

* Every command routes to a workflow per aggregate, using Temporal signals for safe, sequential processing.
* Workflow TTL is used to control lifecycle; `continueAsNew` is technically available but largely redundant.
* Sagas model time-based orchestration (delayed commands, conditional logic) and operate in parallel with aggregates.

#### 3. **Command → Saga → PM Pipeline**

* Commands go through the aggregate → events trigger sagas → sagas emit new commands or delays.
* Process Managers are on deck — to take over where sagas are too reactive and stateless.

#### 4. **Policy Evaluation Layer**

* A condition evaluation engine exists — evaluates RBAC and domain-specific checks.
* Each domain registers its own conditions (no spaghetti, no reverse dependencies).
* Evaluations are context-driven (role, userId, etc.) and decoupled from control flow.

#### 5. **Tracing + Observability**

* Metadata propagation for `correlationId`, `causationId`, `requestId`, etc. is built-in.
* Utility functions (`trace()`) support structured instrumentation.
* OpenTelemetry integration is planned for system-wide tracing and span export.

#### 6. **Test Coverage**

* Integration tests simulate command/event lifecycles, TTL expiry, and workflow signal handling.
* Assertions verify routing, deduplication, and workflow isolation.
* Some observability hooks already instrumented for trace propagation.

#### 7. **Projections (In Progress)**

* Projection handlers follow an `EventHandler` contract and are backed by a `ReadModelUpdaterPort`.
* Intended to sync with Supabase tables, served via RLS.
* Projections will reflect role-based access with plans to integrate view policies.

#### 8. **Separation of Concerns**

* `core/`: business logic, coordination, contracts, policies, projections, shared helpers.
* `infra/`: event stores, pumps, Temporal bindings, Supabase plumbing.
* Clean modular boundaries with minimal leakage between intent and mechanism.

---

### 🔮 **SYSTEM TRAJECTORY (NEXT STAGE)**

#### 1. **Read-Side Delivery (Projections + RLS)**

* Build user- and role-aware projections for read models.
* Backed by Supabase and protected via RLS, with per-role filters based on policy.

#### 2. **Client SDK (Supabase/Firebase Hybrid)**

* Expose command API and read model access to clients.
* Consider Firebase for auth and offline scenarios; Supabase for queries and role enforcement.

#### 3. **Process Managers**

* Introduce PMs as stateful orchestration units.
* Handle retries, compensations, long-lived flows, and multi-aggregate coordination.
* Give sagas room to breathe by pushing heavy logic to PMs.

#### 4. **Vertical Slice Modeling**

* Move toward DCB-style architecture — per-slice ownership of behavior, access, projections, and orchestration.
* Kill the centralized “aggregate as God object” pattern.
* Organize system by process, not type.

#### 5. **AI-Aided Event Modeling (Optional)**

* Use Miro or DSL-based JSON exports to generate contracts and workflows.
* Potential integration with AI tools for structure validation or modeling assistance.
* Skip building a UI — let AI and event modeling live where it’s natural.

---

### TL;DR

The system is not just an event bus with delusions of grandeur.
It's a runtime with opinionated coordination, behavioral contracts, observability, and real-world event flow handling.

Next steps bring it closer to client delivery, coordination clarity, and developer ergonomics — all while keeping the system observable and deterministic.