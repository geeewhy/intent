"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trace = trace;
function trace(ctx, span, data) {
    ctx.emitInternalSignal?.('obs.trace', { span, data });
}
//# sourceMappingURL=observability.js.map