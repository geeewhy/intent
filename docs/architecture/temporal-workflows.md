# Temporal Workflow Orchestration (Deep Dive)

This document elaborates on Intent's use of Temporal for orchestrating domain workflows, building on the Saga concept introduced in the core concepts documentation.

## Why Temporal in Intent?

[Temporal](https://temporal.io/) is a workflow orchestration platform that Intent uses to manage complex, long-running business processes. It was chosen for several key reasons:

1. **Durability**: Workflows continue executing even if the process or machine fails
2. **Reliability**: Automatic retries for failed activities
3. **Visibility**: Provides visibility into workflow execution status and history
4. **Scalability**: Workers can be scaled independently to handle load
5. **Long-running processes**: Supports processes that can run for days, weeks, or even longer

These characteristics make Temporal an ideal fit for implementing event-sourced systems where reliability and consistency are paramount.

## Key Temporal Concepts in Intent

### Workflows

Workflows in Temporal are durable, fault-tolerant functions that orchestrate activities. They are defined as code but executed as persistent, resumable programs that can span long periods of time.

In Intent, workflows are implemented in `src/infra/temporal/workflows/` and are responsible for orchestrating the command-event-projection cycle.

### Activities

Activities are the building blocks of workflows. They are individual tasks that workflows orchestrate. Activities can be retried independently if they fail, without having to restart the entire workflow.

In Intent, activities are defined in `src/infra/temporal/activities/` and serve as the bridge between Temporal workflows and the core domain logic.

### Workers

Workers are processes that execute workflow and activity code. They poll task queues for work and execute the corresponding code.

Intent includes a worker implementation in `src/infra/worker.ts` that registers workflows and activities with Temporal. The worker can be started with:

```bash
npm run dev:worker aggregates  # starts the aggregates worker
npm run dev:worker sagas       # starts the sagas worker
```

## The processCommand Workflow

The most important workflow in Intent is the `processCommand` workflow, which encapsulates the full command→event→projection cycle:

```typescript
export async function processCommand(command: Command): Promise<CommandResult> {
  // 1. Load the aggregate
  const aggregate = await activities.loadAggregate(
    command.tenant_id,
    command.aggregateType,
    command.aggregateId
  );

  // 2. Generate events for the command
  const result = await activities.routeCommand(command);
  if (result.status !== 'success') {
    return result;
  }

  // 3. Apply the events to the aggregate
  await activities.applyEvents(
    command.tenant_id,
    command.aggregateType,
    command.aggregateId,
    result.events
  );

  // 4. Project the events to read models
  await activities.projectEvents(result.events);

  // 5. Route the events to interested handlers (e.g., sagas)
  for (const event of result.events) {
    await activities.routeEvent(event);
  }

  return result;
}
```

This workflow ensures that all steps in command processing are completed reliably, with automatic retries for any failures. It maintains atomicity across the entire process, ensuring that either all steps complete successfully or none do.

## Core Activities

The activities used by workflows are the bridge between Temporal and the core domain logic. The key activities include:

### 1. loadAggregate

Loads an aggregate from the event store, optionally using a snapshot for optimization:

```typescript
export async function loadAggregate(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<BaseAggregate<any>> {
    // 1. Try to load the latest snapshot
    const snapshot = await eventStore.loadLatestSnapshot(tenantId, aggregateType, aggregateId);

    // 2. Determine the starting version
    const startingVersion = snapshot ? snapshot.version : 0;

    // 3. Load events after the snapshot version
    const events = await eventStore.loadEvents(
        tenantId,
        aggregateType,
        aggregateId,
        startingVersion
    );

    // 4. Create or rehydrate the aggregate
    let aggregate;
    if (snapshot) {
        // Create from snapshot
        const AggregateClass = AggregateRegistry[aggregateType];
        aggregate = AggregateClass.fromSnapshot(snapshot);
    } else if (events.length > 0) {
        // Rehydrate from events
        const AggregateClass = AggregateRegistry[aggregateType];
        aggregate = AggregateClass.rehydrate(events);
    } else {
        // Aggregate doesn't exist yet
        throw new Error(`Aggregate ${aggregateType}:${aggregateId} not found`);
    }

    // 5. Apply any events after the snapshot
    if (snapshot) {
        for (const event of events) {
            aggregate.apply(event);
        }
    }

    return aggregate;
}
```

### 2. routeCommand

Routes commands to appropriate handlers in the domain:

```typescript
export async function routeCommand(command: Command): Promise<CommandResult> {
    if (!router) {
        router = await WorkflowRouter.create();
    }
    return router.handle(command);
}
```

### 3. applyEvents

Applies events to an aggregate and saves them to the event store:

```typescript
export async function applyEvents(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    events: Event[],
): Promise<void> {
    // 1. Validate events
    // 2. Append events to the event store
    await eventStore.appendEvents(tenantId, events);

    // 3. Optionally create a snapshot
    if (shouldCreateSnapshot(events)) {
        await snapshotAggregate(tenantId, aggregateType, aggregateId);
    }
}
```

### 4. projectEvents

Projects events to read models:

```typescript
export async function projectEvents(events: Event[]): Promise<void> {
    await projectEventsInfra(events, projectionPool);
}
```

### 5. routeEvent

Routes events to interested handlers (e.g., Saga/PMs):

```typescript
export async function routeEvent(event: Event): Promise<void> {
    if (!router) {
        router = await WorkflowRouter.create();
    }
    return router.on(event);
}
```

## Workflow Router

The `WorkflowRouter` class is a key component that ensures each aggregate's commands go to the correct workflow. It uses the aggregate ID as part of the Temporal workflow ID, ensuring single-threaded command processing per aggregate:

```typescript
export class WorkflowRouter {
    private commandHandlers: CommandHandler[] = [];
    private eventHandlers: EventHandler[] = [];

    static async create(): Promise<WorkflowRouter> {
        // Load all command and event handlers
        const router = new WorkflowRouter();
        await router.initialize();
        return router;
    }

    async handle(command: Command): Promise<CommandResult> {
        // Find the appropriate command handler
        const handler = this.findCommandHandler(command);
        if (!handler) {
            return { status: 'fail', error: `No handler for command type: ${command.type}` };
        }

        // Load the aggregate
        const aggregate = await loadAggregate(
            command.tenant_id,
            command.aggregateType,
            command.aggregateId
        );

        // Handle the command
        try {
            const events = await handler.handleWithAggregate(command, aggregate);
            return { status: 'success', events };
        } catch (error: any) {
            return { status: 'fail', error: error.message };
        }
    }

    async on(event: Event): Promise<void> {
        // Find all event handlers that support this event
        const handlers = this.findEventHandlers(event);

        // Process the event with each handler
        for (const handler of handlers) {
            await handler.on(event);
        }
    }

    // Helper methods...
}
```

This router ensures that:

1. Commands are routed to the appropriate handler
2. Events are routed to all interested handlers
3. Aggregate consistency is maintained (commands for the same aggregate are processed sequentially)

## Workers

Workers are the processes that execute workflow and activity code. Intent's worker implementation is in `src/infra/worker.ts`:

```typescript
async function startWorker() {
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    const worker = await Worker.create({
        connection,
        namespace: 'default',
        taskQueue: 'intent-tasks',
        workflowsPath: require.resolve('./infra/temporal/workflows'),
        activities: {
            loadAggregate,
            routeCommand,
            applyEvents,
            projectEvents,
            routeEvent,
            // Other activities...
        },
    });

    await worker.run();
}

startWorker().catch((err) => {
    console.error(err);
    process.exit(1);
});
```

This worker registers all workflows and activities with the Temporal server, making them available for execution.

## Benefits and Trade-offs

### Benefits

1. **Reliability**: Temporal will retry failed activities, and preserve workflow state across failures
2. **Observability**: Temporal Web UI provides visibility into workflow execution, making debugging easier
3. **Saga Pattern**: Temporal is a natural fit for implementing the Saga pattern for complex business processes
4. **Scalability**: Workers can be scaled independently to handle increased load
5. **Versioning**: Temporal supports versioning of workflow and activity code, making it easier to evolve the system

### Trade-offs

1. **Determinism**: Workflow code must be deterministic to ensure consistent replay, which can be challenging
2. **Learning Curve**: Temporal has a unique programming model that requires understanding
3. **Complexity**: Adding Temporal introduces another system to manage and monitor
4. **State Size**: Large workflow states can impact performance

## Integration with Other Patterns

Temporal workflow orchestration in Intent integrates seamlessly with other architectural patterns:

1. **Event Sourcing**: Workflows orchestrate the loading and applying of events
2. **CQRS**: Workflows ensure that commands are processed and events are projected to read models
3. **Domain-Driven Design**: Workflows respect domain boundaries and aggregate consistency rules
4. **Multi-tenancy**: Workflow IDs include tenant information to maintain isolation

## Observability

Intent includes comprehensive observability features for Temporal workflows:

1. **Tracing**: Activities use `traceSpan` for distributed tracing
2. **Logging**: Extensive logging throughout activities and workflows
3. **Error Handling**: Structured error handling and reporting
4. **Temporal Web UI**: Provides visibility into workflow execution status and history

## Adding New Workflows and Activities

To extend Intent with new workflows or activities:

1. **Define a new activity**: Create a new function in `src/infra/temporal/activities/` and register it in the worker
2. **Define a new workflow**: Create a new function in `src/infra/temporal/workflows/` that orchestrates activities
3. **Register with the worker**: Update `src/infra/worker.ts` to include the new workflow or activity
4. **Invoke the workflow**: Use the Temporal client to start the workflow

For example, to add a new workflow for a custom long-running saga:

```typescript
// Define the workflow
export async function customSagaWorkflow(input: CustomSagaInput): Promise<void> {
    // Orchestrate activities to implement the saga
    const result1 = await activities.firstStep(input);
    const result2 = await activities.secondStep(result1);
    await activities.finalStep(result2);
}

// Register with the worker
const worker = await Worker.create({
    // ...
    workflowsPath: require.resolve('./infra/temporal/workflows'),
    // ...
});

// Invoke the workflow
const client = new Client({
    connection,
    namespace: 'default',
});
const handle = await client.workflow.start(customSagaWorkflow, {
    taskQueue: 'intent-tasks',
    workflowId: `custom-saga-${input.id}`,
    args: [input],
});
```

This extensibility allows Intent to support a wide range of complex business processes while maintaining reliability and observability.
