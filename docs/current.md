### **CURRENT SYSTEM OUTLOOK**

**(Core runtime, determinism-focused, observable and functional)**

#### 1. **Event-Sourced Core**

- Models domain behavior through explicit commands/events with full causality, correlation, and trace context.
- Aggregates strictly rehydrate via event replay; logic remains deterministic and side-effect free.
- Strongly-typed, composable, and immutable contracts ensure clarity and maintainability.

#### 2. **Temporal Workflow Runtime**

- Commands route explicitly per aggregate via Temporal workflows, ensuring ordered, reliable signal processing.
- Workflows use TTL for lifecycle management; `continueAsNew` currently unused.
- Sagas handle reactive orchestration, emitting delayed or conditional commands alongside aggregates.

#### 3. **Command → Saga → PM Pipeline**

- Commands trigger aggregate state changes → emitted events trigger sagas → sagas orchestrate downstream commands.
- Process Managers planned to orchestrate complex, long-lived processes and multi-aggregate workflows.

#### 4. **Policy Evaluation Layer**

- Condition evaluation engine decoupled from domain logic, cleanly supporting RBAC and domain-specific rules.
- Conditions registered locally per domain; evaluated contextually (role, tenant, user).

#### 5. **Tracing + Observability**

- Built-in propagation of `correlationId`, `causationId`, `requestId` ensures end-to-end visibility.
- Structured instrumentation utilities (`trace()`) established; OpenTelemetry integration pending completion.

#### 6. **Test Coverage**

- Robust integration tests verify command routing, event lifecycle, Temporal workflow behavior, and RLS policies.
- Tests explicitly confirm multi-tenant isolation, role-based access control, and determinism.

#### 7. **Projections + RLS**

- Projections follow clear `EventHandler` contracts, decoupled via `ReadModelUpdaterPort`.
- Automatic generation of Supabase Row-Level Security policies at runtime based on domain-slice access models.
- Verified tenant isolation and authorization via comprehensive integration tests.

#### 8. **Separation of Concerns**

- `core/`: Contains strictly pure domain logic, deterministic helpers (`buildEvent`, `buildCommand`), policies, and projections.
- `infra/`: Houses infrastructure-specific adapters (event storage, Temporal workflows, Supabase adapters, structured logging).
- Clear boundaries between business logic and infrastructure adapters maintained.

---

### **SYSTEM TRAJECTORY (NEXT STAGE)**

- Shift towards richer client integration, process orchestration clarity, and streamlined developer tooling.
- Strengthen runtime guarantees and observability through automated testing, schema drift detection, and robust monitoring.
