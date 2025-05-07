# Hexagonal Architecture Multi-Tenant Backend with simplistic, principal driven but pragmatic ES/DDD

A multi-tenant backend system for KitchenEats using hexagonal architecture with Supabase, Temporal, and PostgreSQL.

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

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd kitchen-eats-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=kitcheneats

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Server
PORT=3000
```

### Running the Application

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

4. In a separate terminal, start the Colyseus server:

```bash
npm run start
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

## React Client Integration

To integrate with a React client, use the provided `useEventStream` hook:

```typescript
import { useEventStream } from '../hooks/useEventStream';

function OrderList({ tenantId }) {
  // Use the event stream hook to hydrate from snapshots and stream events
  const { 
    isLoading, 
    error, 
    events, 
    putCommand 
  } = useEventStream({ 
    tenantId,
    onEvent: (event) => {
      console.log('New event received:', event);
    }
  });

  // Create a new order
  const createOrder = async () => {
    const result = await putCommand('createOrder', {
      orderId: crypto.randomUUID(),
      userId: 'user-123',
      items: [
        {
          menuItemId: 'menu-item-1',
          quantity: 1,
          specialInstructions: 'No onions please'
        }
      ],
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    });

    if (result.success) {
      console.log('Order created with command ID:', result.commandId);
    } else {
      console.error('Failed to create order:', result.error);
    }
  };

  // Render the component
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={createOrder}>Create Order</button>
      <ul>
        {events.map(event => (
          <li key={event.id}>{event.type}: {JSON.stringify(event.payload)}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Project Structure

```
/src
  /client                 # Client-side code
    /ui                   # UI client code
      /components         # React components
        OrderList.tsx     # Example component using useEventStream
      /hooks              # React hooks
        useEventStream.ts # Hook for hydrating and streaming events
    /cmdline              # Command-line tool
      index.ts            # Command-line interface for testing
  /domain                 # Core domain logic
    /aggregates           # Aggregate roots
      order.aggregate.ts  # Order aggregate with business logic
    /services             # Domain services
      order.service.ts    # Order service implementing CommandPort and EventPort
    contracts.ts          # Command and event contracts
    ports.ts              # Port interfaces
  /infra                  # Infrastructure adapters
    /supabase             # Supabase adapters
      /edge-functions     # Supabase Edge Functions
        command.ts        # Edge Function for handling commands
    /pg                   # PostgreSQL adapters
      pg-event-store.ts   # PostgreSQL implementation of EventStorePort
      command-pump.ts     # Worker that listens for commands and starts workflows
    /temporal             # Temporal adapters
      /activities         # Temporal activities
        order-activities.ts # Activities for order processing
      /workflows          # Temporal workflows
        order-workflows.ts # Workflows for order processing
      temporal-scheduler.ts # Implementation of JobSchedulerPort
  worker.ts               # Temporal worker entry point
/temporal-config          # Temporal dynamic configuration files
  development.yaml        # Development environment configuration for Temporal
```

### Running the Command-Pump Worker

The command-pump worker listens for new commands via PostgreSQL notifications and starts Temporal workflows. To run it:

```bash
# In development mode
npm run dev:command-pump

# In production mode
npm run start:command-pump
```

#### Testing the Command-Pump Worker

A test script is provided to verify that the command-pump worker is working correctly:

```bash
# Start the command-pump worker in one terminal
npm run dev:command-pump

# Run the test script in another terminal
npx ts-node src/test/test-command-pump.ts
```

The test script inserts a test command into the database and checks if the command-pump worker processes it. If the worker is functioning correctly, you should see "Command has been processed successfully!" in the output.

### Command-Line Tool

A command-line tool is provided for testing commands and events in the system. This tool allows you to send commands to the system and listen for events in real-time. It continues listening for events after commands are sent, making it useful for testing and debugging.

#### Running the Command-Line Tool

```bash
# In development mode
npm run dev:cmdline -- --tenant <tenant-id> [--command <command-type>]

# In production mode (after building)
npm run start:cmdline -- --tenant <tenant-id> [--command <command-type>]
```

The tool requires a tenant ID to be specified. You can optionally specify a command type to execute immediately.

#### Available Commands

Once the tool is running, you can enter the following commands:

- `createOrder` - Create a new order
- `updateOrderStatus` - Update an order's status
- `cancelOrder` - Cancel an order
- `help` - Display help information
- `exit` - Exit the application

#### Example Usage

```bash
# Start the tool and listen for events for tenant "123e4567-e89b-12d3-a456-426614174000"
npm run dev:cmdline -- --tenant 123e4567-e89b-12d3-a456-426614174000

# Start the tool and immediately create an order for tenant "123e4567-e89b-12d3-a456-426614174000"
npm run dev:cmdline -- --tenant 123e4567-e89b-12d3-a456-426614174000 --command createOrder
```

After starting the tool, you'll see a prompt where you can enter commands. The tool will guide you through the process of creating the command payload by asking for the necessary information.

When events are received, they will be displayed in the console, and you can continue entering commands.

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

This project is licensed under the MIT License - see the LICENSE file for details.
