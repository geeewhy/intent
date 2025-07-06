# Intent Architecture Reflections

## Summary

`Intent` is built using a architecture that combines several modern software design patterns and approaches. As a multi-tenant, hexagonal backend, it serves as a pragmatic, principled reference implementation for event-sourced CQRS systems:

1. **Domain-Driven Design (DDD)**: The codebase is organized around the business domain, with clear separation between core domain logic and infrastructure concerns.

2. **Event Sourcing**: The system uses events as the source of truth, storing all changes to the application state as a sequence of events.

3. **Command Query Responsibility Segregation (CQRS)**: Commands (write operations) and queries (read operations) are separated, with different models for writing and reading data.

4. **Temporal Workflow Orchestration**: Complex business processes are orchestrated using Temporal, providing durability and reliability for long-running operations.

5. **PostgreSQL Event Store**: Events are stored in PostgreSQL, with support for snapshots to optimize performance.

6. **Read Models Projections**: Events are projected into read-optimized models to support efficient querying.

7. **Multi-tenancy**: The system is designed to support multiple tenants, with tenant isolation at various levels.

8. **Observability**: The system includes tracing and monitoring capabilities for operational visibility.

## Key Concepts

| Concept             | Description                                                           | Implementation                                                       |
|---------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------|
| Registry            | Registry for all core concepts                                        | Defined in `src/core/registry.ts`                                    |
| Aggregate           | A cluster of domain objects treated as a single unit for data changes | Defined in `src/core/shared/aggregate.ts`                              |
| Command             | An intent to change the system state                                  | Represented by the `Command` interface in `src/core/contracts.ts`    |
| Command Bus         | Routes commands to appropriate handlers                               | Implemented in `src/core/command-bus.ts`                             |
| Event               | A record of something that happened in the system                     | Represented by the `Event` interface in `src/core/contracts.ts`      |
| Event Bus           | Routes events to interested handlers                                  | Implemented in `src/core/event-bus.ts`                               |
| Event Store         | Persists events as the source of truth                                | Implemented in `src/infra/pg/pg-event-store.ts`                      |
| Projection          | Updates read models based on events                                   | Implemented in various files under `src/core/slices/*/read-models/` and `src/core/example-slices/*/read-models/` |
| Saga/Process        | Orchestrates complex business processes                               | Defined by the `SagaDefinition` interface in `src/core/contracts.ts` |
| Temporal Activities | Durable operations that can be retried                                | Implemented in `src/infra/temporal/activities/`                      |
| Temporal Workflows  | Orchestrates activities in a reliable way                             | Implemented in `src/infra/temporal/workflows/`                       |
| Snapshot            | Point-in-time capture of aggregate state                              | Supported by the event store for performance optimization            |
| Read Model          | Optimized representation of data for querying                         | Updated by projections based on events                               |
| Multi-tenancy       | Support for multiple isolated customer environments                   | Implemented with tenant_id in commands, events, and database tables  |
| Observability       | Monitoring and tracing capabilities                                   | Implemented in `src/infra/observability/`                            |

## Architecture Layers

1. **Core (Domain Layer)** – `src/core/`
   - Contains pure business logic: aggregates, commands, events, and sagas
   - No dependency on infrastructure; replay-safe and testable
   - Organized into domain-specific vertical slices in the `slices/` directory with example implementations in `example-slices/`

2. **Infra (Adapter Layer)** – `src/infra/`
   - Adapters for ports: PostgreSQL (event store, projections), Temporal (workflow engine), Supabase (auth)
   - Command/event pumps, observability hooks, and RLS enforcement live here
   - Respects slice boundaries; no core leakage

3. **Tooling Layer** – `src/tools/`
   - Projection drift repair, snapshot verification, RLS linting, and devX CLI helpers
   - Tied into CI for consistency enforcement and automated repair

## Further Topics to Explore

- [Domain modeling approach and aggregate design](note-domain-modeling.md)
- [Event sourcing patterns and optimizations](note-event-sourcing.md)
- [Projection implementation and schema management](note-cqrs-projections.md)
- [Temporal workflow patterns](note-temporal-workflows.md)
- [Multi-tenancy implementation details](note-multi-tenancy.md)
- [Observability and monitoring approach](note-observability.md)
- [Testing strategies (integration tests, etc.)](note-testing-strategies.md)
