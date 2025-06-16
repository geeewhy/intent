# Observability & Monitoring

This document provides a deep dive into how Intent implements observability beyond the basics, covering the technical details of tracing, logging, and monitoring throughout the system.

## OpenTelemetry Integration

Intent uses OpenTelemetry as its observability framework, providing distributed tracing capabilities across all components of the system. The implementation is both simple and powerful:

```typescript
// src/infra/observability/otel-trace-span.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('infra');

export async function traceSpan<T>(
    name: string,
    attributes: Record<string, any>,
    fn: () => Promise<T>
): Promise<T> {
    console.log(`[otel-traceSpan] Starting span: ${name}`, attributes);
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
        try {
            return await fn();
        } catch (error) {
            if (error instanceof Error) {
                span.recordException(error);
            } else {
                span.recordException({ message: String(error) });
            }
            throw error;
        } finally {
            span.end();
        }
    });
}
```

This `traceSpan` helper function is used throughout the codebase to wrap operations in trace spans. It provides:

1. **Automatic Error Recording**: Any exceptions thrown during the operation are automatically recorded in the span
2. **Proper Span Lifecycle**: Spans are always ended, even if an error occurs
3. **Attribute Enrichment**: Operations can include relevant attributes for context
4. **Simplified API**: A clean, consistent interface for creating spans

### Usage Examples

The `traceSpan` helper is used in various parts of the system:

```typescript
// Command handling
await traceSpan('command.handle', { command }, async () => {
    // Command handling logic
});

// Event processing
await traceSpan('event.process', { event }, async () => {
    // Event processing logic
});

// Database operations
await traceSpan('db.query', { query, params }, async () => {
    // Database query execution
});
```

This consistent approach ensures that all major flows in the system are properly instrumented, providing end-to-end traceability.

## Workflow Tracing

One of the most innovative aspects of Intent's observability is how it handles tracing in workflow engine. Since workflows must be deterministic (the same inputs must produce the same outputs), traditional tracing can be challenging.

Intent solves this with a clever signal-based approach:

```typescript
// From src/infra/temporal/workflows/processCommand.ts
const obsTraceSignal = defineSignal<[{ span: string; data?: Record<string, any> }]>('obs.trace');

setHandler(obsTraceSignal, async ({span, data}) => {
    await emitObservabilitySpan(span, data);
});
```

The `emitObservabilitySpan` activity creates a span without executing any code:

```typescript
// From src/infra/temporal/activities/observabilityActivities.ts
export async function emitObservabilitySpan(span: string, data?: Record<string, any>) {
    await traceSpan(span, data || {}, async () => {});
}
```

This pattern allows:

1. **Non-intrusive Tracing**: Workflows can be traced without modifying their deterministic logic
2. **External Observability**: External systems can send signals to workflows to create spans
3. **Workflow Correlation**: Traces can be correlated with workflow execution
4. **Long-running Process Visibility**: Even workflows that run for days or weeks can emit trace markers

### Workflow Tracing in Action

When a workflow is running, it can receive an `obs.trace` signal to create a span:

```typescript
// Example of sending a trace signal to a workflow
await client.workflow.signalWithStart(processCommand, {
    taskQueue: 'intent-tasks',
    workflowId,
    signal: obsTraceSignal,
    signalArgs: [{ span: 'workflow.milestone.reached', data: { milestone: 'payment-processed' } }],
    args: [command],
});
```

This creates a trace span without affecting the deterministic execution of the workflow, providing visibility into the workflow's progress.

## Projection Tracing

Projections are a critical part of the CQRS pattern in Intent, and they are fully instrumented for observability:

```typescript
// From src/infra/projections/projectEvents.ts
for (const event of events) {
  for (const h of handlers) {
    if (!h.supportsEvent(event)) continue;

    try {
      await traceSpan(`projection.handle.${event.type}`, { event }, () =>
          h.on(event),
      );
    } catch (err) {
      console.warn('Projection failed', { eventType: event.type, error: err });
    }
  }
}
```

This provides:

1. **Per-Event Tracing**: Each projection handler execution is wrapped in a span
2. **Event Context**: The span includes the event data for context
3. **Error Tracking**: Failed projections are logged with detailed error information
4. **Performance Monitoring**: Span durations reveal how long each projection takes to process events

This level of detail is invaluable for debugging projection issues and understanding the performance characteristics of the read model updates.

## Logging

While the note focuses primarily on tracing, Intent also includes a structured logging system:

```typescript
// Example of structured logging with context
logger.info('Command processed', {
    commandId: command.id,
    commandType: command.type,
    tenantId: command.tenant_id,
    correlationId: command.metadata?.correlationId,
    duration: performance.now() - startTime,
});
```

Key aspects of the logging system:

1. **Structured Format**: Logs are structured (typically JSON) for easy parsing and analysis
2. **Context Enrichment**: Logs include relevant context like tenant IDs and correlation IDs
3. **Log Levels**: Different log levels (debug, info, warn, error) for appropriate verbosity
4. **Correlation with Traces**: Logs include trace identifiers for correlation with distributed traces

The `LoggerPort` interface provides a consistent logging API across the system, which can be implemented by various logging backends (e.g., pino, winston).

## Testing Observability

Intent takes the unusual but valuable step of testing its observability instrumentation. This ensures that the observability features themselves are working correctly:

```typescript
// From src/infra/observability/otel-test-tracer.ts
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const memoryExporter = new InMemorySpanExporter();

const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
});

provider.register({ contextManager });
```

Integration tests verify that spans are created correctly:

```typescript
// From src/infra/integration-tests/otel.test.ts
it('emits a projection.handle span', async () => {
    memoryExporter.reset();

    const evt: Event = {
        id: randomUUID(),
        type: 'testExecuted',
        // ... other fields
    };

    await projectEvents([evt], pool);

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].name).toBe('projection.handle.testExecuted');
});
```

This approach:

1. **Verifies Instrumentation**: Ensures that spans are created as expected
2. **Prevents Regressions**: Catches changes that might break observability
3. **Documents Expected Behavior**: Shows what spans should be created in different scenarios

## Observability Patterns

Intent follows several key patterns for effective observability:

### Span Naming Conventions

Consistent span naming makes it easier to understand and query traces:

- `projection.handle.{eventType}` for projection handlers
- `command.handle.{commandType}` for command handlers
- `workflow.{workflowName}.{activity}` for workflow activities
- `db.{operation}` for database operations

### Attribute Enrichment

Spans are enriched with relevant attributes to provide context:

```typescript
await traceSpan('command.handle', {
    commandId: command.id,
    commandType: command.type,
    tenantId: command.tenant_id,
    aggregateId: command.payload.aggregateId,
    aggregateType: command.payload.aggregateType,
}, async () => {
    // Command handling logic
});
```

These attributes make it possible to filter and analyze traces based on various dimensions.

### Error Tracking

Errors are automatically recorded in spans, providing valuable debugging information:

```typescript
try {
    return await fn();
} catch (error) {
    if (error instanceof Error) {
        span.recordException(error);
    } else {
        span.recordException({ message: String(error) });
    }
    throw error;
}
```

This ensures that when something goes wrong, the trace contains detailed error information.

### Correlation IDs

Every workflow and request carries a correlationId (from Metadata) which is included in logs and traces:

```typescript
// Example of propagating correlation IDs
const correlationId = command.metadata?.correlationId || randomUUID();
const childCommand = {
    // ...command properties
    metadata: {
        ...command.metadata,
        correlationId,
        causationId: command.id,
    },
};
```

This allows for tracking related operations across system boundaries.

## Benefits of Intent's Observability

The comprehensive observability in Intent provides several key benefits:

1. **Debugging**: When issues occur, traces provide a detailed timeline of what happened, making it easier to identify the root cause.

2. **Performance Tuning**: Span durations reveal performance bottlenecks, showing which operations are taking the most time.

3. **System Understanding**: Traces provide a visual representation of how the system works, helping new developers understand the flow of operations.

4. **Operational Visibility**: Patterns in traces can reveal operational issues, such as increased latency or error rates.

5. **Cross-Component Correlation**: Traces span across system boundaries, showing how different components interact.

## Extending Observability

To add observability to new components in Intent:

1. **Use the `traceSpan` Helper**: Wrap operations in `traceSpan` calls to create spans.

2. **Follow Naming Conventions**: Use consistent span names that follow the established patterns.

3. **Include Relevant Attributes**: Add attributes that provide context for the operation.

4. **Propagate Context**: Ensure that trace context is propagated across async boundaries.

5. **Test Instrumentation**: Write tests that verify spans are created as expected.

By following these guidelines, new components will maintain the same level of observability as the rest of the system.

## Observability Configuration

Intent's observability can be configured through environment variables:

```
# Observability configuration
LOG_LEVEL=info                 # Log level (debug, info, warn, error)
LOG_ERRORS_TO_STDERR=false     # Whether to log errors to stderr
OTEL_EXPORTER_OTLP_ENDPOINT=   # OpenTelemetry collector endpoint
OTEL_RESOURCE_ATTRIBUTES=      # Resource attributes for spans
```

This allows for tuning the verbosity and destination of logs and traces based on the environment (development, staging, production).