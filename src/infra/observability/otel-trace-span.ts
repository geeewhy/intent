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
