# Domain Modeling & Aggregates (Deep Dive)

This document provides a detailed exploration of how domain modeling is implemented in Intent, expanding on the basic Aggregate concept introduced in the architecture overview.

## Domain-Driven Design in Intent

Intent follows Domain-Driven Design (DDD) principles to model complex business domains. The system organizes domain logic around business concepts, using aggregates as the primary building blocks. This approach ensures that business rules are enforced consistently and that the system accurately reflects the real-world domain it represents.

## BaseAggregate: The Foundation

At the core of Intent's domain modeling is the `BaseAggregate` abstract class, which provides the foundation for all domain aggregates:

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

### Key Features of BaseAggregate

1. **Generic State Type**: Uses a generic type parameter `TState` to define the shape of the aggregate's state
2. **Version Tracking**: Maintains a version number for optimistic concurrency control
3. **Schema Versioning**: Supports evolving the aggregate's schema over time via `CURRENT_SCHEMA_VERSION`
4. **Command Handling**: The `handle` method processes commands and produces events
5. **Event Application**: The `apply` method updates the aggregate's state based on events
6. **Snapshot Support**: Methods for creating and applying snapshots to optimize loading

## Concrete Aggregate Example: SystemAggregate

To illustrate how aggregates are implemented in practice, let's examine the `SystemAggregate` class:

```typescript
export class SystemAggregate extends BaseAggregate<SystemSnapshotState> {
    public aggregateType = 'system';
    static CURRENT_SCHEMA_VERSION = 1;

    // State properties
    id: UUID;
    version = 0;
    numberExecutedTests = 0;

    // Command handling
    private readonly handlers: Record<SystemCommandType, (cmd: Command) => Event[]> = {
        [SystemCommandType.LOG_MESSAGE]: this.handleLogMessage,
        [SystemCommandType.EXECUTE_TEST]: this.handleExecuteTest,
        // Other command handlers...
    };

    public handle(cmd: Command): Event[] {
        const handler = this.handlers[cmd.type as SystemCommandType];
        if (!handler) {
            throw new Error(`No handler for command type: ${cmd.type}`);
        }
        return handler.call(this, cmd);
    }

    // Event application
    public apply(event: Event, isNew = true): void {
        switch (event.type) {
            case SystemEventType.MESSAGE_LOGGED:
                this.applyMessageLogged(event as Event<MessageLoggedPayload>);
                break;
            case SystemEventType.TEST_EXECUTED:
                this.applyTestExecuted(event as Event<TestExecutedPayload>);
                break;
            // Other event handlers...
        }
        
        if (isNew) {
            this.version++;
        }
    }

    // Specific command handlers
    private handleLogMessage(cmd: Command<LogMessagePayload>): Event[] {
        // Business logic and validation
        return [
            createEvent({
                type: SystemEventType.MESSAGE_LOGGED,
                aggregateId: this.id,
                aggregateType: this.aggregateType,
                payload: { message: cmd.payload.message },
                version: this.version + 1,
                tenant_id: cmd.tenant_id,
            })
        ];
    }

    // Specific event handlers
    private applyTestExecuted(event: Event<TestExecutedPayload>): void {
        this.numberExecutedTests++;
    }

    // Snapshot methods
    protected applyUpcastedSnapshot(state: SystemSnapshotState): void {
        this.numberExecutedTests = state.numberExecutedTests;
        this.version = state.version;
    }

    extractSnapshotState(): SystemSnapshotState {
        return {
            numberExecutedTests: this.numberExecutedTests,
            version: this.version,
        };
    }
}
```

### Key Aspects of the Implementation

1. **State Definition**: The aggregate defines its state properties (e.g., `numberExecutedTests`)
2. **Command Handler Map**: Uses a map to route commands to specific handler methods
3. **Event Application**: Dispatches events to specific handlers based on event type
4. **Business Rules**: Enforces business rules in command handlers
5. **Version Management**: Increments the version when applying new events
6. **Snapshot Support**: Implements methods to create and apply snapshots

## Aggregate Registry

Intent maintains a registry of aggregate types, which allows the system to dynamically create and load aggregates based on their type:

```typescript
export const AggregateRegistry: Record<string, AggregateClass> = {
  system: SystemAggregate,
  // Other aggregate types would be registered here
};
```

This registry is crucial for the event sourcing mechanism, as it enables the system to:

1. Create the correct aggregate type when loading from events or snapshots
2. Route commands to the appropriate aggregate type
3. Maintain a catalog of all available aggregate types in the system

## Command Processing Flow

When a command is received, it follows this processing flow:

1. The command is routed to the appropriate command handler based on its type
2. The command handler loads or creates the target aggregate
3. The aggregate's `handle` method processes the command and produces events
4. The events are persisted to the event store
5. The events are applied to the aggregate to update its state

This flow is implemented in the command handlers, such as `SystemCommandHandler`:

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

## Schema Evolution and Versioning

Intent supports evolving aggregate schemas over time through:

1. **Schema Version Tracking**: Each aggregate class defines a `CURRENT_SCHEMA_VERSION` static property
2. **Snapshot Upcasting**: When loading a snapshot with an older schema version, the system can upcast it to the current version
3. **Backward Compatibility**: Events are designed to be backward compatible, with upcasters for handling schema changes

This approach allows the system to evolve while maintaining compatibility with historical data.

## Benefits of This Approach

The domain modeling approach in Intent provides several benefits:

1. **Encapsulation**: Business rules are encapsulated within the aggregate
2. **Consistency**: Aggregates ensure consistency boundaries are maintained
3. **Event Sourcing Integration**: The design works seamlessly with event sourcing
4. **Versioning Support**: Built-in support for schema evolution
5. **Clear Responsibility**: Each aggregate has a clear responsibility in the domain
6. **Testability**: Aggregates can be tested in isolation from infrastructure

## Domain Modeling Principles

Intent follows several key domain modeling principles:

1. **Ubiquitous Language**: The code encourages using domain terminology consistently
2. **Bounded Contexts**: The system is organized into distinct domain slices
3. **Aggregates as Consistency Boundaries**: Each aggregate enforces its own consistency rules
4. **Rich Domain Model**: Business logic is in the domain model, not in application services
5. **Separation of Concerns**: Clear separation between domain logic and infrastructure

## Integration with Other Patterns

Domain modeling in Intent integrates with several other architectural patterns:

1. **Event Sourcing**: Aggregates are the source of events
2. **CQRS**: Aggregates are part of the write model
3. **Temporal Workflows**: Complex processes may involve multiple aggregates
4. **Multi-tenancy**: Aggregates maintain tenant isolation throughout the system