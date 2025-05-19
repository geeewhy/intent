| Size | Status  | Item                                    | Why                                                                                                    |
|------|---------|-----------------------------------------|--------------------------------------------------------------------------------------------------------|
| s    | PARTIAL | **Read Model Drift Repair**             | Simple toolt to repair projections by replays                                                          |
| s    | PARTIAL | **Read Model Drift Detection**          | Automatically validate event schemas against projections, catching schema drift early.                 |
| xl   | N/A     | **Client SDK & Real-Time Tools**        | Develop SDK conforming to Supabase’s real-time APIs; leverage local `pg_notify` for streamlined dev.   |
| m    | N/A     | **Projection Failure Metrics**          | Capture projection errors explicitly to quickly detect and diagnose failures.                          |
| m    | N/A     | **Command-Scoped Projection Tagging**   | Explicitly link projections to their causation commands for comprehensive end-to-end traceability.     |
| l    | N/A     | **Event Upcasting Strategy**            | Enable schema evolution for historical event compatibility with clearly defined migration tests.       |
| m    | N/A     | **Snapshot Upcasting Tests**            | Ensure backward compatibility and correctness of snapshot-based rehydration.                           |
| l    | N/A     | **Observability & Prometheus**          | Wire infrastructure-level metrics into Prometheus; finalize OpenTelemetry spans across Temporal flows. |
| l    | N/A     | **Example App Using SDK**               | Demonstrate best practices, event-driven patterns, client SDK usage, and observability in action.      |
| xl   | N/A     | **Process Managers (PMs)**              | Implement for complex stateful orchestration scenarios, enabling clearer sagas and robust workflows.   |
| xl   | N/A     | **AI-Aided Event Modeling (Optional)**  | Use AI integration (Miro/DSL) for generating contracts and workflows, ensuring structural correctness. |
| xl   | N/A     | **Codegen & Boilerplate Automation**    | Automate repetitive domain code (event handlers, aggregates) to accelerate development velocity.       |
