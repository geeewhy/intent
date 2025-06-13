# Infrastructure Layer for Event Sourcing in src/infra

Implements the infrastructure layer that supports the Event Sourcing architecture defined in the core domain. This layer provides concrete implementations of the ports defined in the core, handles persistence, and integrates with external systems.

## Key Components

### 1. Event Store Implementations
The infrastructure layer provides multiple implementations of the Event Store:

- **PostgreSQL Event Store** (`pg-event-store.ts`):
  - Persists events and snapshots in PostgreSQL
  - Implements optimistic concurrency control
  - Handles tenant isolation
  - Manages schema versioning for snapshots
  - Provides efficient event loading with snapshot support

- **In-Memory Event Store** (`memory-event-store.ts`):
  - Lightweight implementation for testing
  - Simulates the same interface as the PostgreSQL implementation
  - Supports snapshots and optimistic concurrency

### 2. Command Store
- **PgCommandStore** (`pg-command-store.ts`):
  - Persists commands in PostgreSQL
  - Tracks command status (pending, consumed, processed, failed)
  - Supports command metadata and results

### 3. Projections Framework
The projections subsystem transforms events into read models:

- **Projection Loader** (`loadProjections.ts`):
  - Dynamically loads all registered projections
  - Creates database updaters for each projection table
  - Connects projections to their persistence mechanism

- **PostgreSQL Updater** (`pg-updater.ts`):
  - Generic implementation of `ReadModelUpdaterPort`
  - Handles upsert and delete operations for read models
  - Uses SQL query building with proper escaping

- **Event Projector** (`projectEvents.ts`):
  - Routes events to appropriate projection handlers
  - Handles batching for efficiency
  - Includes error handling and tracing

### 4. Event and Command Pumps
The pump subsystem provides real-time processing of new events and commands for devs:

- **Realtime Pump Base** (`realtime-pump-base.ts`):
  - Generic foundation for real-time data processing
  - Connects to Supabase for change notifications
  - Implements batching and queue management
  - Handles backpressure
  - WARNING: experimental and local use cases only

- **Event Pump** (`event-pump.ts`):
  - Listens for new events in the database
  - Publishes events to the event bus
  - Supports multi-tenancy
  - WARNING: experimental and local use cases only

- **Command Pump** (`command-pump.ts`):
  - Listens for new commands in the database
  - Schedules command processing via Temporal
  - Tracks command status
  - WARNING: experimental and local use cases only

### 5. Temporal Integration
The infrastructure layer integrates with Temporal for workflow orchestration:

- **Scheduler** (`scheduler.ts`):
  - Implements `JobSchedulerPort` and `EventPublisherPort`
  - Schedules commands for execution via Temporal workflows
  - Handles command results and status updates
  - Publishes events to interested workflows

- **Workflow Router** (`workflow-router.ts`):
  - Routes commands to appropriate Temporal workflows
  - Maps domain concepts to workflow execution
  - Provides workflow client management

## Integration Patterns

### 1. Adapter Pattern
The infrastructure implements ports defined in the core domain:
- `EventStorePort` → `PgEventStore`, `InMemoryEventStore`
- `CommandStorePort` → `PgCommandStore`
- `ReadModelUpdaterPort` → `createPgUpdaterFor`
- `JobSchedulerPort` → `TemporalScheduler`

### 2. Observer Pattern
- Event bus publishes to multiple subscribers
- Projections react to events
- Pumps observe database changes

### 3. Factory Pattern
- Projection factories create handlers with dependencies injected
- Updater factories create table-specific updaters

## Advanced Features

### 1. Distributed Processing
- **Temporal Workflows**: Durable, reliable execution of business processes
- **Change Data Capture**: Real-time reaction to database changes
- **Batching**: Efficient processing of events in groups

### 2. Resilience
- **Error Handling**: Comprehensive error handling throughout
- **Retries**: Support for retryable operations
- **Idempotency**: Safe reprocessing of events and commands

### 3. Observability
- **Tracing**: OpenTelemetry integration for distributed tracing
- **Logging**: Structured logging with context
- **Metrics**: Performance monitoring

### 4. Performance Optimization
- **Snapshotting**: Periodic snapshots to avoid replaying all events
- **Batching**: Processing events in batches for efficiency
- **Connection Pooling**: Database connection management

## How It Supports Event Sourcing

The infrastructure layer provides the technical foundation that makes Event Sourcing practical:

1. **Persistence**: Reliable storage of events, commands, and snapshots
2. **Concurrency Control**: Prevents conflicts when multiple processes update the same aggregate
3. **Read Model Generation**: Transforms events into queryable read models
4. **Real-time Processing**: Ensures events are processed promptly
5. **Workflow Management**: Orchestrates complex business processes
6. **Multi-tenancy**: Isolates data between tenants
7. **Scalability**: Supports horizontal scaling through distributed processing

## Integration with External Technologies

The infrastructure layer integrates with several external technologies:

- **PostgreSQL**: Primary data store for events, commands, and read models
- **Temporal**: Workflow engine for reliable process orchestration
- **OpenTelemetry**: Distributed tracing and observability
- **Slonik**: SQL query builder with type safety
- **Supabase**: Real-time change notifications (optional / experimental pumps)

This infrastructure layer aims to provide a robust, scalable foundation that allows the domain logic to focus on business rules while the technical concerns of persistence, distribution, and integration are handled separately.