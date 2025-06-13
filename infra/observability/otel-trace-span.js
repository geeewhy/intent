"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceSpan = traceSpan;
// src/infra/observability/otel-trace-span.ts
const api_1 = require("@opentelemetry/api");
const logger_1 = require("../../core/logger");
const tracer = api_1.trace.getTracer('infra');
async function traceSpan(name, attributes, fn) {
    (0, logger_1.log)()?.debug('Starting span', {
        spanName: name,
        attributes,
        component: 'otel-tracing'
    });
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
        try {
            return await fn();
        }
        catch (error) {
            if (error instanceof Error) {
                span.recordException(error);
            }
            else {
                span.recordException({ message: String(error) });
            }
            throw error;
        }
        finally {
            span.end();
        }
    });
}
//# sourceMappingURL=otel-trace-span.js.map