// infra/temporal/activities/observabilityActivity.ts
import { traceSpan } from '../../observability/otel-trace-span';

export async function emitObservabilitySpan(span: string, data?: Record<string, any>) {
    await traceSpan(span, data || {}, async () => {});
}
