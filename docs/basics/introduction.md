# Introduction to Intent

## What is Intent?

Intent is a pragmatic, ports-first reference platform for multi-tenant, event-sourced CQRS back-ends powered by TypeScript and [Temporal](https://github.com/temporalio/temporal) for durable workflow execution. It turns event-sourcing theory into a platform you can demo in five minutes.

## Who is it for?

Intent is designed for developers building high-fidelity, multi-tenant backends with complex business logic. It's particularly well-suited for:

- AI orchestration systems
- Financial applications
- Manufacturing industries
- Async-heavy workflows
- SaaS platforms
- High-complexity business domain applications

## Core Design Principles

Intent is built on several modern software design patterns:

- **Domain-Driven Design (DDD)**: The codebase is organized around the business domain, with clear separation between core domain logic and infrastructure concerns.
- **Event Sourcing**: The system uses events as the source of truth, storing all changes to the application state as a sequence of events.
- **Command Query Responsibility Segregation (CQRS)**: Commands (write operations) and queries (read operations) are separated, with different models for writing and reading data.
- **Hexagonal Architecture**: Technology-agnostic core logic with adapters for infrastructure that plug in via explicit, testable ports.
- **Multi-tenancy**: The system is designed to support multiple tenants, with tenant isolation at various levels.

## Key Capabilities

| Capability | What it gives you |
|------------|-------------------|
| **Lossless event sourcing** | Guarantees no data loss, even under retries, crashes, or partial failures. Every command, event, and projection is persisted and replayable. |
| **Built-in multi-tenant isolation** | Tenant IDs propagate edge → core → infra. Row isolation in DB and namespaced workflows prevent accidental cross-tenant access or leaks. |
| **Automatic RLS enforcement** | Each projection declares access rules in metadata; they are compiled into Postgres RLS policies. CI linter blocks insecure access before it ships. |
| **Temporal workflow orchestration** | Commands and events are processed in durable Temporal workflows → supports back-pressure, retries, and exactly-once delivery at the source of truth. |
| **Observability** | Unified structured logging with context-aware `LoggerPort`, customizable log levels, and error serialization. OpenTelemetry spans wrap all key flows; logs and traces correlate via causation/correlation IDs. |

## Key Terminology

Intent uses several key concepts that are central to its architecture:

- **Commands**: Represent an intent to change the system state.
- **Events**: Records of things that have happened in the system.
- **Aggregates**: Clusters of domain objects treated as a single unit for data changes.
- **Sagas**: Orchestrate complex business processes.
- **Projections**: Update read models based on events.

These concepts will be covered in more depth in later sections of the documentation.

## Why Intent?

Intent is more than a framework. It's an event-sourced CQRS reference platform designed from first principles for simplicity and developer velocity in multi-tenant TypeScript backends.

- **Reference Architecture**: Strict hexagonal boundaries, ports/adapters separation, and vertical slicing. Every workflow and projection is testable, composable, and observable.
- **Built for Safety and Evolution**: Automated RLS policy generation, drift detection and repair, snapshotting, and schema upcasting are not afterthoughts -- they are part of the platform's DNA.
- **Full-Stack Dev Experience**: The DevX companion UI, CLI flows, and local-first patterns make simulating, debugging, and evolving your event-sourced system immediate and visual.
- **Multi-Tenant and Policy-First**: Tenant isolation and access policies are enforced from edge to core to database -- by design, not convention.
- **Transparent, Documented, and Extensible**: Every architectural decision is captured in living ADRs. The codebase is structured for clarity, modification, and onboarding.