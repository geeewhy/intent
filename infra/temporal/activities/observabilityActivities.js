"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitObservabilitySpan = emitObservabilitySpan;
// infra/temporal/activities/observabilityActivity.ts
const otel_trace_span_1 = require("../../observability/otel-trace-span");
async function emitObservabilitySpan(span, data) {
    await (0, otel_trace_span_1.traceSpan)(span, data || {}, async () => { });
}
//# sourceMappingURL=observabilityActivities.js.map