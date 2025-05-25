// src/test/utils/otel-test-tracer.ts
import { trace, context as apiContext } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';

export const memoryExporter = new InMemorySpanExporter();

const contextManager = new AsyncHooksContextManager().enable();
apiContext.setGlobalContextManager(contextManager);

const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
});

provider.register({ contextManager });

export const tracer = trace.getTracer('test-tracer');
