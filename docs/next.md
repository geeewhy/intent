| Item                                  | Why                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Projection Failure Metrics**        | Capture projection errors explicitly to quickly detect and diagnose failures.                          |
| **Read Model Drift Detection**        | Automatically validate event schemas against projections, catching schema drift early.                 |
| **Command-Scoped Projection Tagging** | Explicitly link projections to their causation commands for comprehensive end-to-end traceability.     |
| **Event Upcasting Strategy**          | Enable schema evolution for historical event compatibility with clearly defined migration tests.       |
| **Snapshot Upcasting Tests**          | Ensure backward compatibility and correctness of snapshot-based rehydration.                           |
| **Observability & Prometheus**        | Wire infrastructure-level metrics into Prometheus; finalize OpenTelemetry spans across Temporal flows. |
| **Client SDK & Real-Time Tools**      | Develop SDK conforming to Supabase’s real-time APIs; leverage local `pg_notify` for streamlined dev.   |
| **Example App Using SDK**             | Demonstrate best practices, event-driven patterns, client SDK usage, and observability in action.      |
| **Process Managers (PMs)**            | Implement for complex stateful orchestration scenarios, enabling clearer sagas and robust workflows.   |
| **AI-Aided Event Modeling (Optional)**| Use AI integration (Miro/DSL) for generating contracts and workflows, ensuring structural correctness. |
| **Codegen & Boilerplate Automation**  | Automate repetitive domain code (event handlers, aggregates) to accelerate development velocity.       |
