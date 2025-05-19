# Hexagonal Architecture Multi-Tenant Backend with simplistic, principal driven but pragmatic ES/DDD

Intent, Event-sourced Execution Model using hexagonal architecture.

Current outlook is in [docs/current.md](docs/current.md).

Directory structure is in [docs/structure.md](docs/structure.md).

## Architecture

This project implements a hexagonal architecture (ports and adapters) pattern to separate the core domain logic from infrastructure concerns. The system is designed to be multi-tenant, with each household (tenant) having its own isolated data and real-time communication.

### Key Components

- **Core Domain**: Pure TypeScript business logic with no dependencies on external frameworks
- **Supabase**: Real-time communication, authentication, and Edge Functions
- **PostgreSQL**: Event store and data persistence with tenant isolation using Row-Level Security
- **Temporal**: Workflow orchestration for long-running processes
- **Command-Pump**: Worker that listens for new commands and starts Temporal workflows

### System Flow

1. **Client** sends commands to the **Edge Function** with JWT authentication
2. **Edge Function** validates JWT, extracts tenant_id, and inserts command into database
3. **Command-Pump** listens for new commands via PostgreSQL notifications
4. **Command-Pump** starts a Temporal workflow for each command
5. **Temporal Workflow** processes the command and appends events to the event store
6. **Supabase Realtime** streams events to clients via WebSockets
7. **Client** hydrates from snapshots and applies events to build the current state

### Hexagonal Architecture

The project follows a strict hexagonal architecture:

- **Domain Core**: Aggregates, services, and business logic
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
