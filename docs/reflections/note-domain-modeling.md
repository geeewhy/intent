# Domain Modeling and Aggregate Design in Intent

## Overview

Domain-Driven Design (DDD) is a core architectural approach in Intent. The system models the business domain using aggregates, which are clusters of domain objects treated as a single unit for data changes. This approach ensures that business rules are enforced consistently and that the system accurately reflects the real-world domain it represents.

## Aggregate Pattern Implementation

### BaseAggregate Abstract Class

The foundation of domain modeling in the system is the `BaseAggregate` abstract class defined in `src/core/shared/aggregate.ts`:

```typescript
export abstract class BaseAggregate<TState> {
    abstract aggregateType: string;
    version = 0;

    constructor(public id: UUID) {}

    // Schema versioning
    static CURRENT_SCHEMA_VERSION = 1;

    // Abstract methods that must be implemented by concrete aggregates
    abstract apply(event: any, isSnapshot?: boolean): void;
    abstract handle(command: any): Event[];
    protected abstract applyUpcastedSnapshot(state: TState): void;
    abstract extractSnapshotState(): TState;

    // Methods for snapshot handling
    applySnapshotState(raw: any, incomingVersion?: number): void { /* ... */ }
    toSnapshot(): Snapshot<TState> { /* ... */ }
    static fromSnapshot<T extends BaseAggregate<any>>(this: new (id: UUID) => T, event: any): T { /* ... */ }
}
```

Key features of the `BaseAggregate` class:

1. **Generic State Type**: Uses a generic type parameter `TState` to define the shape of the aggregate's state
2. **Version Tracking**: Maintains a version number for optimistic concurrency control
3. **Schema Versioning**: Supports evolving the aggregate's schema over time
4. **Event Sourcing Integration**: Provides methods for applying events and creating snapshots
5. **Command Handling**: Requires concrete implementations to handle commands and produce events

### Concrete Aggregate Example: SystemAggregate

The `SystemAggregate` class in `src/core/example-slices/system/aggregates/system.aggregate.ts` demonstrates how to implement a concrete aggregate:

```typescript
export class SystemAggregate extends BaseAggregate<SystemSnapshotState> {
    public aggregateType = 'system';
    static CURRENT_SCHEMA_VERSION = 1;

    // State properties
    id: UUID;
    version = 0;
    numberExecutedTests = 0;

    // Static factory methods
    static create(cmd: Command<...>): SystemAggregate { /* ... */ }
    static rehydrate(events: Event[]): SystemAggregate { /* ... */ }

    // Command handling
    private readonly handlers: Record<SystemCommandType, (cmd: Command) => Event[]> = { /* ... */ };
    public handle(cmd: Command): Event[] { /* ... */ }

    // Event application
    public apply(event: Event, isNew = true): void { /* ... */ }

    // Specific command handlers
    private handleLogMessage(cmd: Command<LogMessagePayload>): Event[] { /* ... */ }
    private handleExecuteTest(cmd: Command<ExecuteTestPayload>): Event[] { /* ... */ }
    // ... other command handlers

    // Specific event handlers
    private applyMessageLogged(_: Event<MessageLoggedPayload>): void { /* ... */ }
    private applyTestExecuted(_: Event<TestExecutedPayload>): void { /* ... */ }
    // ... other event handlers

    // Snapshot methods
    protected upcastSnapshotState(raw: any, version: number): SystemSnapshotState { /* ... */ }
    protected applyUpcastedSnapshot(state: SystemSnapshotState): void { /* ... */ }
    extractSnapshotState(): SystemSnapshotState { /* ... */ }
}
```

Key features of the `SystemAggregate` implementation:

1. **State Definition**: Defines a specific state type (`SystemSnapshotState`)
2. **Command Handler Registry**: Uses a map of command types to handler methods
3. **Event Application**: Dispatches events to specific handlers based on event type
4. **Business Rules**: Enforces business rules in command handlers
5. **Access Control**: Integrates with the policy system for authorization checks
6. **Factory Methods**: Provides static methods for creating and rehydrating aggregates

## Command Processing Flow

The command processing flow involves several components:

1. **Command Bus**: Routes commands to appropriate handlers
2. **Command Handlers**: Domain services that implement the `CommandHandler` interface
3. **Aggregates**: Domain entities that encapsulate business rules and state changes
4. **Event Generation**: Commands result in events that represent state changes

The `SystemCommandHandler` class shows how command handlers interact with aggregates:

```typescript
export class SystemCommandHandler implements CommandHandler<Command<any>> {
    supportsCommand(cmd: Command): boolean {
        return Object.values(SystemCommandType).includes(cmd.type as SystemCommandType);
    }

    async handleWithAggregate(cmd: Command<any>, aggregate: BaseAggregate<any>): Promise<Event<any>[]> {
        if (!(aggregate instanceof SystemAggregate)) {
            throw new Error(`Expected SystemAggregate but got ${aggregate.constructor.name} for cmd: ${cmd.type}`);
        }
        return aggregate.handle(cmd);
    }
}
```

## Aggregate Registry

The system maintains a registry of aggregate types in `src/core/registry.ts`:

This registry allows the system to dynamically create and load aggregates based on their type.

## Benefits of the Aggregate Pattern

1. **Encapsulation**: Business rules are encapsulated within the aggregate
2. **Consistency**: Aggregates ensure consistency boundaries are maintained
3. **Event Sourcing Integration**: The design works seamlessly with event sourcing
4. **Versioning Support**: Built-in support for schema evolution
5. **Clear Responsibility**: Each aggregate has a clear responsibility in the domain

## Domain Modeling Principles

Intent follows several key domain modeling principles:

1. **Ubiquitous Language**: The code encourages using domain terminology consistently
2. **Bounded Contexts**: The system is organized into distinct domain slices
3. **Aggregates as Consistency Boundaries**: Each aggregate enforces its own consistency rules
4. **Rich Domain Model**: Business logic is in the domain model, not in application services
5. **Separation of Concerns**: Clear separation between domain logic and infrastructure

## Integration with Other Patterns

Domain modeling in Intent integrates with several other patterns:

1. **Event Sourcing**: Aggregates are the source of events
2. **CQRS**: Aggregates are part of the write model
3. **Temporal Workflows**: Complex processes may involve multiple aggregates
4. **Multi-tenancy**: Maintain tenant isolation through and through; from commands to events, aggregates and projections
