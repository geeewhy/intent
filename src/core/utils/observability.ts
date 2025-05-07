//core/order/index.ts
import {SagaContext} from "../contracts";

export function trace(
    ctx: SagaContext,
    span: string,
    data?: Record<string, any>
) {
    ctx.emitInternalSignal?.('obs.trace', { span, data });
}