# System Architecture Overview

Intent is designed as a multi-tenant, hexagonal backend that serves as a pragmatic, principled reference implementation for event-sourced CQRS systems. This document provides a high-level overview of Intent's architecture for experienced developers or those seeking the "big picture."

## Key Architectural Patterns

Intent combines several modern software design patterns and approaches:

1. **Domain-Driven Design (DDD)**: The codebase is organized around the business domain, with clear separation between core domain logic and infrastructure concerns. Domain concepts are modeled as aggregates, commands, events, and sagas, reflecting real-world business processes.

2. **Event Sourcing**: The system uses events as the source of truth, storing all changes to the application state as a sequence of events. This provides a complete audit trail and enables temporal queries (what was the state at a given point in time).

3. **Command Query Responsibility Segregation (CQRS)**: Commands (write operations) and queries (read operations) are separated, with different models for writing and reading data. This allows for optimized read models and scalability.

4. **Temporal Workflow Orchestration**: Complex business processes are orchestrated using Temporal, providing durability and reliability for long-running operations. Workflows can be paused, resumed, and retried automatically.

5. **PostgreSQL Event Store with Snapshots**: Events are stored in PostgreSQL, with support for snapshots to optimize performance when loading aggregates with long histories.

6. **Read Model Projections**: Events are projected into read-optimized models to support efficient querying. Projections are defined in code and automatically kept in sync with the database schema.

7. **Multi-tenancy**: The system is designed to support multiple tenants, with tenant isolation at various levels (database, domain, API, processing). Every command, event, and database table includes tenant information.

8. **Observability**: The system includes comprehensive tracing and monitoring capabilities for operational visibility, using OpenTelemetry for distributed tracing and structured logging.

## Architecture Layers

Intent follows a hexagonal (ports-and-adapters) architecture, which is reflected in its directory structure:

### 1. Core (Domain Layer) - `src/core/`

- Contains pure business logic: aggregates, commands, events, and sagas
- No dependency on infrastructure; replay-safe and testable
- Organized into domain-specific vertical slices (e.g., `system/`, `orders/`)

The Core layer defines the interfaces (ports) that the infrastructure layer implements, ensuring that business logic remains independent of technical concerns.

### 2. Infra (Adapter Layer) - `src/infra/`

- Adapters for ports: PostgreSQL (event store, projections), Temporal (workflow engine), Supabase (auth)
- Command/event pumps, observability hooks, and RLS enforcement live here
- Respects slice boundaries; no core leakage

The Infra layer provides concrete implementations of the ports defined in the Core layer, connecting the business logic to external systems and technologies.

### 3. Tooling Layer - `src/tools/`

- Projection drift repair, snapshot verification, RLS linting, and devX CLI helpers
- Tied into CI for consistency enforcement and automated repair

The Tooling layer provides developer utilities and CI/CD helpers to ensure the system remains consistent and secure.

## Key Concepts Reference Table

| Concept | Description | Implementation |
|---------|-------------|----------------|
| Aggregate | A cluster of domain objects treated as a single unit for data changes | Defined in `src/core/aggregates.ts` with a registry of aggregate types |
| Command | An intent to change the system state | Represented by the `Command` interface in `src/core/contracts.ts` |
| Command Bus | Routes commands to appropriate handlers | Implemented in `src/core/command-bus.ts` |
| Event | A record of something that happened in the system | Represented by the `Event` interface in `src/core/contracts.ts` |
| Event Bus | Routes events to interested handlers | Implemented in `src/core/event-bus.ts` |
| Event Store | Persists events as the source of truth | Implemented in `src/infra/pg/pg-event-store.ts` |
| Projection | Updates read models based on events | Implemented in various files under `src/core/*/read-models/` |
| Saga/Process | Orchestrates complex business processes | Defined by the `SagaDefinition` interface in `src/core/contracts.ts` |
| Temporal Activities | Durable operations that can be retried  |
| Temporal Workflows | Orchestrates activities in a reliable way |
| Snapshot | Point-in-time capture of aggregate state | Supported by the event store for performance optimization |
| Read Model | Optimized representation of data for querying | Updated by projections based on events |
| Multi-tenancy | Support for multiple isolated customer environments | Implemented with tenant_id in commands, events, and database tables |
| Observability | Monitoring and tracing capabilities | Implemented in `src/infra/observability/` |

## Design Decisions and Rationale

The architecture of Intent is designed to address several key concerns:

- **Reliability**: Event sourcing ensures no data loss, even under retries, crashes, or partial failures.
- **Scalability**: CQRS separates write and read models, allowing each to scale independently.
- **Maintainability**: Hexagonal architecture keeps the core logic clean and testable.
- **Security**: Multi-tenancy and RLS policies ensure proper data isolation.
- **Observability**: Comprehensive tracing and logging provide visibility into system behavior.

Each of these architectural patterns and concepts is explored in more depth in dedicated pages:

- [Domain Modeling & Aggregates](domain-modeling.md)
- [Event Sourcing Pattern & Event Store](event-sourcing.md)
- [CQRS Read Model Design & Projection Management](cqrs-projections.md)
- [Temporal Workflow Orchestration](temporal-workflows.md)
- [Multi-Tenancy Design Details](multi-tenancy-details.md)
- [Observability & Monitoring](observability-details.md)
- [Testing Strategies and CI](testing-strategies.md)