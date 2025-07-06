# Temporal Workflow Orchestration in Intent

## Overview

Temporal is a workflow orchestration platform used in Intent to manage complex, long-running business processes. It provides durability, reliability, and visibility for workflows, ensuring that they complete successfully even in the face of failures and system outages.

## Key Concepts

### Workflows

Workflows in Temporal are durable, fault-tolerant functions that orchestrate activities. They are defined as code but executed as persistent, resumable programs that can span long periods of time.

In Intent, workflows are used to orchestrate complex business processes, such as processing commands and handling events.

### Activities

Activities are the building blocks of workflows. They are individual tasks that workflows orchestrate. Activities can be retried independently if they fail, without having to restart the entire workflow.

In Intent, activities are defined in `src/infra/temporal/activities/` and include operations like:
- Loading aggregates
- Applying events
- Projecting events to read models
- Dispatching commands

### Workers

Workers are processes that execute workflow and activity code. They poll task queues for work and execute the corresponding code.

Intent includes a worker implementation in `src/infra/worker.ts` that registers workflows and activities with Temporal.

## Implementation Details

### Core Activities

The core activities are defined in `src/infra/temporal/activities/coreActivities.ts` and include:

1. **projectEvents**: Projects events to read models
   ```typescript
   export async function projectEvents(events: Event[]) {
       await projectEventsInfra(events, projectionPool);
   }
   ```

2. **routeEvent**: Routes events to appropriate handlers
   ```typescript
   export async function routeEvent(event: Event): Promise<void> {
       if (!router) {
           router = await WorkflowRouter.create();
       }
       return router.on(event);
   }
   ```

3. **routeCommand**: Routes commands to appropriate handlers
   ```typescript
   export async function routeCommand(command: Command): Promise<CommandResult> {
       if (!router) {
           router = await WorkflowRouter.create();
       }
       return router.handle(command);
   }
   ```

4. **loadAggregate**: Loads an aggregate from the event store
   ```typescript
   export async function loadAggregate(
       tenantId: UUID,
       aggregateType: string,
       aggregateId: UUID
   ): Promise<any | null> {
       // Implementation details...
   }
   ```

5. **applyEvents**: Applies events to an aggregate and saves them to the event store
   ```typescript
   export async function applyEvents(
       tenantId: UUID,
       aggregateType: string,
       aggregateId: UUID,
       events: Event[],
   ): Promise<void> {
       // Implementation details...
   }
   ```

### Workflow Router

The `WorkflowRouter` class in `src/infra/temporal/workflow-router.ts` is responsible for routing commands and events to the appropriate handlers. It acts as a bridge between the Temporal activities and the domain logic.

### Process Command Workflow

The `processCommand` workflow in `src/infra/temporal/workflows/processCommand.ts` orchestrates the command processing flow:

1. Load the aggregate
2. Generate events for the command
3. Apply the events to the aggregate
4. Project the events to read models
5. Route the events to interested handlers

This workflow ensures that all steps in command processing are completed reliably, with automatic retries for any failures.

## Benefits of Using Temporal

1. **Durability**: Workflows continue executing even if the process or machine fails
2. **Visibility**: Provides visibility into workflow execution status and history
3. **Reliability**: Automatic retries for failed activities
4. **Scalability**: Workers can be scaled independently to handle load
5. **Versioning**: Supports versioning of workflow and activity code
6. **Testing**: Facilitates testing of complex workflows

## Integration with Other Patterns

Temporal workflow orchestration in Intent integrates with several other patterns:

1. **Event Sourcing**: Workflows orchestrate the loading and applying of events
2. **CQRS**: Workflows ensure that commands are processed and events are projected to read models
3. **Domain-Driven Design**: Workflows respect domain boundaries and aggregate consistency rules
4. **Saga Pattern**: Complex business processes can be implemented as sagas using Temporal workflows

## Challenges and Considerations

1. **Learning Curve**: Temporal has a unique programming model that requires understanding
2. **Determinism**: Workflow code must be deterministic to ensure consistent replay
3. **State Management**: Managing workflow state and handling large state
4. **Versioning**: Handling changes to workflow and activity code over time
5. **Monitoring**: Setting up proper monitoring and alerting for workflows

## Observability

Intent includes observability features for Temporal workflows:

1. **Tracing**: Activities use `traceSpan` for distributed tracing
2. **Logging**: Extensive logging throughout activities and workflows
3. **Error Handling**: Structured error handling and reporting

This observability is crucial for monitoring and debugging complex workflows in production.
