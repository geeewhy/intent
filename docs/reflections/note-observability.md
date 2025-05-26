# Observability and Monitoring in Intent

## Overview

Observability is a critical aspect of the Intent architecture, providing insights into the system's behavior, performance, and health. The system implements distributed tracing using OpenTelemetry, allowing for end-to-end visibility across the various components and services.

## Core Components

### OpenTelemetry Integration

The system uses OpenTelemetry for distributed tracing, with a simple but effective implementation:

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

This implementation provides:
1. A simple API for creating spans with names and attributes
2. Automatic error recording for exceptions
3. Proper span lifecycle management (ensuring spans are always ended)

### Temporal Workflow Observability

Temporal workflows are instrumented for observability using a dedicated signal and activity:

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
1. External systems to send signals to workflows to create spans
2. Workflows to emit spans at key points without modifying the workflow logic
3. Correlation of workflow execution with other system components

### Projection Observability

Projections are instrumented to track their performance and errors:

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
1. Spans for each projection handler execution
2. Correlation of projections with the events they process
3. Error tracking for failed projections

## Testing Observability

The system includes a test tracer for verifying observability instrumentation:

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

## Observability Patterns

### Span Naming Conventions

The system uses consistent span naming conventions:
- `projection.handle.{eventType}` for projection handlers
- Custom span names for workflow activities and other operations

### Attribute Enrichment

Spans are enriched with relevant attributes:
- Event data for projection spans
- Command data for workflow spans
- Error information for exception spans

### Error Tracking

Errors are automatically recorded in spans:
- Exceptions are caught and recorded with stack traces
- Failed projections are logged with event type and error information

## Integration with Other Patterns

Observability in Intent integrates with several other patterns:

1. **Event Sourcing**: Events are tracked through the system with spans
2. **CQRS**: Projections are instrumented to track read model updates
3. **Temporal Workflows**: Workflows emit spans for key activities
4. **Multi-tenancy**: Spans can include tenant information for tenant-specific monitoring

## Benefits of the Observability Approach

1. **End-to-End Visibility**: Traces span across system boundaries
2. **Performance Monitoring**: Span durations provide insights into performance bottlenecks
3. **Error Detection**: Exceptions are automatically recorded in spans
4. **Debugging Support**: Detailed traces help with debugging complex issues
5. **Operational Insights**: Patterns in traces can reveal operational issues

## Challenges and Considerations

1. **Overhead**: Tracing adds some performance overhead
2. **Data Volume**: High-traffic systems generate large volumes of trace data
3. **Privacy Concerns**: Care must be taken not to include sensitive data in spans
4. **Sampling Strategy**: Determining the right sampling rate for traces
5. **Integration Complexity**: Ensuring consistent tracing across all system components

## Future Enhancements

Potential improvements to the observability system could include:

1. **Metrics Collection**: Adding metrics for key system indicators
2. **Structured Logging**: Integrating structured logging with trace context
3. **Alerting Integration**: Connecting traces to alerting systems
4. **Visualization Tools**: Integrating with trace visualization tools
5. **Correlation IDs**: Enhancing correlation across system boundaries
