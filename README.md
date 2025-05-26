# Intent

``Intent`` is a multi-tenant, hexagonal backend that serves as a pragmatic, principled reference implementation for event-sourced CQRS systems.

Highlights include:
- **Ports-first architecture** – primary adapters include PostgreSQL (event store, RLS projections) and Temporal (workflow orchestration), fully isolated behind core-defined interfaces.
- **Workflow-native execution model** – commands and events are processed inside workflows, enabling exactly-once handling, idempotency, durable retries, and strong aggregate isolation.
- **Snapshot-aware event sourcing** – aggregates load from snapshots plus delta events, with snapshots triggered by access frequency to minimize replay and rehydration costs.
- **RLS-secured projections** – access control rules are defined in domain code and compiled into deterministic Postgres row-level policies, enforcing tenant and role isolation.
- **Developer tooling for drift and determinism** – includes a projection drift scanner, auto-repair scripts, RLS linter, and a CLI command-pump for real-time debugging.

See reflections on the architecture and design decisions in [reflections](docs/reflections/index.md) and [ADRs](ADRs/) directory.

See [docs/current.md](docs/current.md) for current system state and [docs/structure.md](docs/structure.md) for directory layout.

You can also check out the [project roadmap](docs/next.md) for future enhancements and features.

## Architecture

This project implements a hexagonal architecture (ports and adapters) pattern to separate the core domain logic from infrastructure concerns. The system is designed to be multi-tenant, with each household (tenant) having its own isolated data and real-time communication.

### Hexagonal Architecture

The project follows a strict hexagonal architecture:

- **Domain Core**: Aggregates and slices of business logic
- **Ports**: Interfaces that define how the domain interacts with the outside world
- **Adapters**: Implementations of the ports that connect to specific technologies

## Getting Started

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- PostgreSQL client (optional, for direct database access)
- Supabase account (for real-time communication)

## Running the Application

1. Start the infrastructure services (PostgreSQL, Temporal):

```bash
docker-compose up -d
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Start the Temporal worker:

```bash
npm run start:worker
```

### Development

For development with hot reloading:

1. Start the infrastructure services:

```bash
docker-compose up -d
```

2. Start the Temporal worker in development mode:

```bash
npm run dev:worker
```

3. In a separate terminal, start the Colyseus server in development mode:

```bash
npm run dev
```

## Multi-tenancy

The system supports multi-tenancy through the following mechanisms:

1. **Tenant Isolation in PostgreSQL**: Row-Level Security ensures each tenant can only access their own data
2. **JWT with tenant_id claim**: Authentication tokens include a tenant_id claim that is used for authorization
3. **Tenant-specific Supabase Channels**: Each household has its own channel for real-time communication
4. **Tenant-specific Temporal Workflows**: Workflows are isolated by tenant ID in the workflow ID and task queue
5. **Snapshots per tenant**: Aggregate snapshots are stored with tenant_id for efficient hydration


## Project Structure

See [directory structure](docs/structure.md) for a detailed overview of the project structure.

### Running the Command-Pump Worker

The command-pump worker listens for new commands via PostgreSQL notifications and starts Temporal workflows. To run it:

```bash
# In development mode
npm run dev:command-pump

# In production mode
npm run start:command-pump
```

### Supabase Edge Functions

The Edge Functions are serverless functions that run on Supabase's infrastructure. They handle commands from clients, validate JWT tokens, and insert commands into the database. To deploy them:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the Edge Functions
supabase functions deploy command
```

### Temporal Configuration

The `temporal-config` directory contains configuration files for the Temporal server. The `development.yaml` file is required for the Temporal server to start properly. It contains dynamic configuration settings that control various aspects of the Temporal server's behavior, such as task queue settings, workflow execution limits, and system features.

## License

TBD. Means you can not do anything with it yet.
