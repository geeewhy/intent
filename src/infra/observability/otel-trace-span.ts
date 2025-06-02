// src/infra/observability/otel-trace-span.ts
import { trace } from '@opentelemetry/api';
import { log } from '../../core/logger';

const tracer = trace.getTracer('infra');

export async function traceSpan<T>(
    name: string,
    attributes: Record<string, any>,
    fn: () => Promise<T>
): Promise<T> {
    log()?.debug('Starting span', { 
        spanName: name, 
        attributes,
        component: 'otel-tracing'
    });
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
