# Next

* To be rated:
    * **Aggregate-level metrics** – Custom span attributes (`aggregateId`, `tenantId`, `version`) enable per-aggregate latency and throughput charts without extra tagging libraries.
    * **Unified logs & traces** – Log lines carry the current span context, so searching logs by correlationId immediately surfaces the matching trace.

| Size | Status  | Item                                            | Why                                                                                                                  |
|------|---------|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| m    | N/A    | **Golden Regression Fixtures for Projections**  | Freeze event streams + expected state to ensure backward compatibility and stable projection evolution. Use Gherkin. |
| m    | N/A    | **Tool: Replay Aggregate or Inspect Saga**      | Allow step-by-step replay or saga inspection for debugging or recovery.                                              |
| m    | N/A    | **Static Saga Plan Snapshot Tests**             | Add unit-level checks for `saga.plan(input)` to verify deterministic outcomes and enable regression tracking.        |
| xl   | N/A     | **Client SDK & Real-Time Tools**                | Develop SDK conforming to Supabase’s real-time APIs; leverage local `pg_notify` for streamlined dev.                 |
| m    | N/A     | **Projection Failure Metrics**                  | Capture projection errors explicitly to quickly detect and diagnose failures.                                        |
| m    | N/A     | **Command-Scoped Projection Tagging**           | Explicitly link projections to their causation commands for comprehensive end-to-end traceability.                   |
| l    | N/A     | **Observability & Prometheus**                  | Wire infrastructure-level metrics into Prometheus; finalize OpenTelemetry spans across Temporal flows.               |
| l    | N/A     | **Example App Using SDK**                       | Demonstrate best practices, event-driven patterns, client SDK usage, and observability in action.                    |
| xl   | N/A     | **Process Managers / cross slice/domain (PMs)** | Implement for complex stateful orchestration scenarios, enabling clearer sagas and robust workflows.                 |
| xl   | N/A     | **AI-Aided Event Modeling (Optional)**          | Use AI integration (Miro/DSL) for generating contracts and workflows, ensuring structural correctness.               |
| xl   | N/A     | **Codegen & Boilerplate Automation**            | Automate repetitive domain code (event handlers, aggregates) to accelerate development velocity.                     |
