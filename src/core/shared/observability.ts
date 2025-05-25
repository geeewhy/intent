// core/shared/observability.ts
// Tracing helper shared across sagas for instrumentation
import { TraceContext } from '../contracts';
export function trace(
    ctx: TraceContext,
    span: string,
    data?: Record<string, any>
) {
    ctx.emitInternalSignal?.('obs.trace', { span, data });
}