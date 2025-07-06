# Event Sourcing Architecture in src/core

## Core Concepts

### 1. Event Sourcing Fundamentals
The codebase implements the core principles of Event Sourcing:
- **Events as the Source of Truth**: The system stores all changes to the application state as a sequence of events
- **Aggregate Reconstruction**: State is reconstructed by replaying events
- **Immutable Event Log**: Events are immutable and represent facts that happened in the system

### 2. Command-Query Responsibility Segregation (CQRS)
The architecture clearly separates:
- **Command Side**: Handles commands that modify state (write operations)
- **Query Side**: Handles queries that read state (read operations)

### 3. Domain-Driven Design (DDD) Patterns
The code follows DDD principles with:
- **Aggregates**: Encapsulate business rules and maintain consistency boundaries
- **Commands**: Represent intent to change state
- **Events**: Represent state changes that have occurred
- **Domain Services**: Coordinate operations across aggregates

## Key Components

### 1. Contracts (`contracts.ts`)
Defines the core interfaces for the ES architecture:
- `Command`: Represents an intent to change state
- `Event`: Represents a state change that has occurred
- `Metadata`: Common metadata for commands and events
- `SagaDefinition`: For orchestrating complex workflows
- `CommandHandler`: For handling specific command types
- `EventHandler`: For handling specific event types

### 2. Aggregates (`shared/aggregate.ts`)
- `BaseAggregate`: Abstract base class for all aggregates
- Implements event application, state extraction, and snapshotting
- Handles commands and produces events
- Maintains version for optimistic concurrency control

### 3. Command Bus (`command-bus.ts`)
- Routes commands to appropriate handlers
- Validates command payloads against schemas
- Enforces tenant isolation
- Provides logging and error handling

### 4. Event Bus (`event-bus.ts`)
- Publishes events to interested handlers
- Supports batch publishing
- Routes events to appropriate projections and process managers

### 5. System Aggregate (`example-slices/system/aggregates/system.aggregate.ts`)
- Example implementation of an aggregate
- Handles system-level commands
- Demonstrates command handling, event application, and state management
- Shows access control integration

### 6. Domain Registry (`domains.ts`, `registry.ts`)
- Registers command handlers, event handlers, and sagas
- Provides a centralized way to access domain components
- Initializes the command bus with registered handlers

## Advanced Features

### 1. Multi-tenancy
- Commands and events include tenant IDs
- Enforces tenant isolation in command handling
- Supports multi-tenant projections

### 2. Access Control
- Integrates with policy-based access control
- Validates user permissions for command execution
- Supports role-based access control

### 3. Snapshotting
- Supports creating and applying snapshots for performance optimization
- Includes schema versioning for snapshots
- Provides upcasting for backward compatibility

### 4. Observability
- Comprehensive logging throughout the system
- Internal signals for tracing and metrics
- Error handling with detailed context

### 5. Saga Orchestration
- Support for process managers and sagas
- Coordination of long-running business processes
- Handling of compensating transactions

## How It Fits Event Sourcing

This architecture implements a mature Event Sourcing system by:

1. **Maintaining Event History**: All state changes are recorded as immutable events
2. **Rebuilding State**: Aggregates can be reconstructed by replaying events
3. **Temporal Queries**: The event log enables querying state at any point in time
4. **Audit Trail**: Events provide a complete audit trail of all changes
5. **Separation of Concerns**: Clear separation between command and query responsibilities
6. **Scalability**: The architecture supports independent scaling of read and write sides
7. **Resilience**: Events can be replayed to recover from failures

The implementation is aimed to serve well-structured, fit-practices for mature platforms, and provides a solid foundation for building complex, event-sourced applications with proper domain modeling and business rule enforcement.
