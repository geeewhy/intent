### Project Structure (can be outdated, to have an idea)

```
.
├── ADRs                            # 🧠 Architectural Decisions: Permanent record of tradeoffs, ideas, and patterns adopted in system
│   ├── 001-hex-partykit-postgres-temporal.md       # Decision to adopt hexagonal style with PartyKit, Postgres, and Temporal
│   ├── 002-hex-suprabase-scaffold-auth.md          # Supabase chosen for identity layer and hosted backend-as-a-service
│   ├── 003-hex-core-workflows-saga.md              # Breakdown of saga execution within Temporal, how domain logic is orchestrated
│   ├── 004-domain-command-handler.md               # Pattern for command routing and handling at domain boundary
│   ├── 005-domain-event-handler.md                 # Event handler lifecycle and process segregation
│   ├── 006-temporal-domain-saga-execution.md       # Explains workflow TTLs, signal batching, and saga orchestration
│   └── 007-events-load-snapshot-playback.md        # Snapshot strategy considerations for event replay vs state rehydration
├── Dockerfile.worker                 # 🐳 Worker container running Temporal activity + workflow logic
├── README.md                         # 📘 Project overview (you should probably drop your latest rundown here)
├── docker-compose.yml                # 🛠 Local dev orchestration: database, Temporal, and worker service mesh
├── docs
│   └── current.md                    # 📄 Living spec or design diary (can be used for modeling state or keeping your sanity)
├── jest.config.js                    # ⚙️ Jest setup for test coverage
├── misc
│   └── conversations                 # 🗣 Brain dump of architecture ideas and debates (keep it going)
│       ├── eventStorePort.md
│       └── saga-vs-pm.md
├── package-lock.json
├── package.json                      # 📦 Node project manifest, build/test scripts, etc.
├── src
│   ├── client                        # 🎯 Auth and CLI-like utility layer for simulating user behavior
│   │   ├── auth
│   │   │   └── test-auth.ts          # Fake/mock login behavior for integration or test runs
│   │   └── cmdline
│   │       ├── index.ts              # CLI entrypoint — useful for local testing or low-friction triggers
│   │       └── test-auth.ts
│   ├── core                          # 💡 Domain and business logic, split from infrastructure. The "heart" of the system
│   │   ├── activities                # Temporal activity bindings that execute side effects
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── aggregates.ts             # Aggregate entrypoint/registry if needed (aggregate orchestration)
│   │   ├── command-bus.ts            # Core bus for dispatching and routing commands (publish/subscribe layer)
│   │   ├── contracts.ts              # Global types (Command, Event, Metadata, UUID, etc.)
│   │   ├── domains.ts                # Domain registry (used to wire up handlers, sagas, projections, etc.)
│   │   ├── errors.ts                 # Domain-specific or core exceptions (used in aggregates and activities)
│   │   ├── event-bus.ts              # Core event dispatcher (for triggering projections, sagas, PMs)
│   │   ├── order                     # 🧾 One vertical slice: contains all logic for "order" lifecycle
│   │   │   ├── __tests__
│   │   │   │   ├── order.saga.test.ts
│   │   │   │   └── order.test.ts     # Unit/integration test coverage for this domain
│   │   │   ├── access.ts             # Role/condition registration for this slice (used by policy engine)
│   │   │   ├── activities            # Order-specific Temporal activities (if any)
│   │   │   │   └── index.ts
│   │   │   ├── aggregates
│   │   │   │   └── order.aggregate.ts  # Business logic — how events mutate state, how commands are validated
│   │   │   ├── contracts.ts          # Type contracts for this domain (payloads, statuses, command types)
│   │   │   ├── index.ts              # Entry point for this domain's exports
│   │   │   ├── sagas
│   │   │   │   ├── order.saga.ts     # Orchestration logic — reacts to events, emits commands (timed or not)
│   │   │   │   └── saga-registry.ts  # Local saga registry to support dynamic wiring
│   │   │   └── services
│   │   │       └── order.service.ts  # Optional command orchestration or query utilities (used by activities)
│   │   ├── policy-registry.ts        # Global condition registry for RBAC and custom rule evaluation
│   │   ├── ports.ts                  # Interfaces/ports: event store, read model adapters, external deps
│   │   └── shared                    # 🧰 Cross-domain helpers like tracing and factories
│   │       ├── command-factory.ts
│   │       ├── event-factory.ts
│   │       ├── metadata.ts
│   │       ├── observability.ts
│   │       ├── saga.ts
│   │       └── type-guards.ts
│   ├── infra                         # 🏗️ Infrastructure adapters: how your system touches the real world
│   │   ├── integration-tests         # End-to-end tests for workflows and event flow assertions
│   │   │   ├── setup.ts
│   │   │   ├── temporal-workflow-integration.test.ts
│   │   │   └── utils.ts
│   │   ├── memory                    # In-memory event store for dev/testing
│   │   │   └── memory-event-store.ts
│   │   ├── pg                        # PostgreSQL event store and pubsub listeners (for command/event relay)
│   │   │   ├── pg-event-store.ts
│   │   │   └── pg-notify-listener.ts
│   │   ├── pump                      # Real-time sync pumps: connect infra with command/event bus
│   │   │   ├── command-pump.ts
│   │   │   ├── event-pump.ts
│   │   │   ├── helpers
│   │   │   │   ├── command-helpers.ts
│   │   │   │   └── supabase-client.ts
│   │   │   └── realtime-pump-base.ts
│   │   ├── supabase                 # Supabase-specific adapters and schema for read models and auth
│   │   │   ├── README.md
│   │   │   ├── admin
│   │   │   │   └── create-auth-users.ts
│   │   │   ├── edge-functions
│   │   │   │   ├── command.ts
│   │   │   │   └── on-signup.ts
│   │   │   ├── sql
│   │   │   │   └── schema.sql
│   │   │   ├── supabase-publisher.ts
│   │   │   └── supabase-server.ts
│   │   └── temporal                 # Temporal integration layer — workflows and dispatchers
│   │       ├── activities
│   │       │   └── coreActivities.ts
│   │       ├── temporal-scheduler.ts
│   │       ├── workflow-router.ts    # Dispatch commands/events to the right workflow by type
│   │       └── workflows
│   │           ├── index.ts
│   │           ├── processCommand.ts  # Main workflow for aggregate lifecycle
│   │           ├── processEvent.ts    # Optional event-router for triggering other workflows
│   │           └── processSaga.ts     # Saga logic and delayed command execution
│   ├── server.ts                    # 🌐 API entrypoint (optional) for serving REST/gRPC/etc.
│   └── worker.ts                    # 👷 Temporal worker instantiation
├── temporal-config
│   └── development.yaml             # Temporal dev environment config
├── test.js                          # Possibly legacy test entry or local script
└── tsconfig.json                    # 🧠 Typescript config
```