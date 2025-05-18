// core/shared/observability.ts
// Tracing helper shared across sagas for instrumentation
import {SagaContext} from "../contracts";

export function trace(
    ctx: SagaContext,
    span: string,
    data?: Record<string, any>
) {
    ctx.emitInternalSignal?.('obs.trace', { span, data });
}