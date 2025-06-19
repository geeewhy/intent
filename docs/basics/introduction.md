# Introduction to Intent

**Intent** is your fast lane to building reliable, testable, multi-tenant backends in TypeScript-- powered by [Temporal](https://github.com/temporalio/temporal), CQRS, and event sourcing. It’s not a framework. It’s a **reference architecture** that doesn't just tell you what to do-- it shows you, tests it, and lints your mistakes before you ship them to production.

You can go from `git clone` to a running, observable, multi-tenant event-sourced system in under five minutes. That’s not marketing -- it’s a challenge.

---

## Who It's For

You’re juggling complex domains. Maybe you’re:

- Building SaaS with user-specific logic and strict data boundaries
- Orchestrating AI/ML pipelines that fail if a single message drops
- Writing backends where auditability, evolution, and traceability aren’t optional
- Tired of explaining what happened when all you have is a `status = failed` row
- Don't want to look at yet another cronjob-triggered endpoint
 
Intent is for **engineers who want explicit architecture**, clean separation of concerns, and the safety net of repeatable patterns.

---

## What You Get

| Feature                           | What it Does                                                                                                          |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| 🧱 **Event-sourced core**         | Write logic as pure command/event flows with replayable, versioned state. No mystery mutations.                       |
| 🧠 **Policy-first multi-tenancy** | Row-level isolation, namespaced workflows, and JWT-based enforcement-- baked in.                                      |
| 🔐 **Fine Grained Security**      | Define access policies once; Intent generates Postgres policies enforcing Row Level Security, lints violations in CI. |
| 🌀 **Workflow orchestration**     | Durable workflows, retries, and exactly-once command processing at the source of truth.                               |
| 🔍 **Observability baked in**     | OpenTelemetry spans + structured logging + DevX UI = no more wondering what just happened.                            |

---

## Intent: In Plain Language

Intent systems are built around a simple idea:

> *What if the system always remembered what happened, why it happened, and how to reason about it-- forever?*

We treat **commands** as the source of intent, **events** as the record of fact, and **aggregates** as the interpreters of meaning. Instead of stuffing logic into services and routes, you build small, testable units of domain logic with full context and traceability.

---

## Core Principles

Intent follows the tried-and-tested patterns-- just without drowning you in theory:

- **DDD (Domain-Driven Design)** - Code structured around business logic, not HTTP handlers
- **Event Sourcing** - Events are your source of truth. Snapshots optional.
- **CQRS** - Separate write models from read models. Scale them independently.
- **Hexagonal Architecture** - All core logic is tech-agnostic and testable. Infra plugs in via explicit ports.
- **Multi-Tenancy** - Every layer-- from JWT to projections-- enforces tenant isolation by design.
- **Security by Design** - Tenant isolation, access control, and data boundaries are enforced from domain logic to database—no afterthoughts, no shortcuts.
---

## Key Concepts

You’ll see these everywhere:

- **Command** - An action a user or system wants to take
- **Event** - A factual record of what actually happened
- **Aggregate** - The source of truth for one piece of state
- **Saga** - A long-running business process that spans multiple commands
- **Projection** - A read model updated by events, optimized for querying

---

## Why This Exists

Because frankly, writing multi-tenant backends is a minefield.  
Intent helps you:

- Avoid accidental cross-tenant data leaks
- Stop guessing what happened when things go wrong
- Test, observe, and evolve systems (except Sundays)
- Understand your business logic as a readable graph of facts-- not a blob of side effects
- Ship a complete event-sourced system without duct-taping 50 libraries together

<sub>disclaimer: all emdashes are converted to poor dev's emdashes.</sub>