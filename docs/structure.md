### Project Structure (can be outdated, to have an idea)

```
.
├── ADRs/                       # Architectural decision logs
├── Dockerfile.worker           # Container for Temporal worker
├── README.md                   # Quick-start & high-level overview
├── docker-compose.yml          # Local infra: Postgres, Temporal, Supabase
├── docs/
│   ├── current.md              # Living spec & design diary
│   ├── debt.md                 # Known technical debt items
│   ├── next.md                 # Planned roadmap / “NEXT” outlook
│   └── structure.md            # <-- you are here
├── jest*.config.js             # Unit / integration test configs
├── setup.sh                    # One-shot project bootstrap helper
├── src/
│   ├── client/                 # Auth helpers & CLI testing harness
│   ├── core/                   # **Pure domain logic** (deterministic)
│   │   ├── activities/         # Type-level bindings for Temporal acts
│   │   ├── base/               # Aggregate super-class (+ tests)
│   │   ├── shared/             # Factories, metadata, tracing, utils
│   │   └── system/             # “system” domain (aggregate, saga, proj)
│   ├── infra/                  # **Adapters** (Postgres, Temporal, Supabase…)
│   │   ├── integration-tests/  # End-to-end flow coverage
│   │   ├── memory/             # In-memory event store for fast tests
│   │   ├── pg/                 # PG event / command stores, NOTIFY listener
│   │   ├── projections/        # Kysely/Slonik read-model adapters
│   │   ├── pump/               # Real-time command/event pumps
│   │   ├── supabase/           # Edge funcs, auth users, SQL, publisher
│   │   └── temporal/           # Schedulers, workflow router, WF code
│   ├── server.ts               # Optional HTTP entry-point
│   ├── tools/                  # DevX scripts (lint RLS, replay events / repair projection drifts, ...)
│   └── worker.ts               # Temporal worker bootstrap
├── temporal-config/            # Dynamic config for local Temporal
```