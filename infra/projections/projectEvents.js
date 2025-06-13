"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectEvents = projectEvents;
const loadProjections_1 = require("./loadProjections");
const otel_trace_span_1 = require("../observability/otel-trace-span");
/**
 * Projects events to read models
 * @param events  Event batch
 * @param pool    Slonik DatabasePool supplied by caller
 */
async function projectEvents(events, pool) {
    const handlers = await (0, loadProjections_1.loadAllProjections)(pool);
    for (const event of events) {
        for (const h of handlers) {
            if (!h.supportsEvent(event))
                continue;
            try {
                await (0, otel_trace_span_1.traceSpan)(`projection.handle.${event.type}`, { event }, () => h.on(event));
            }
            catch (err) {
                console.warn('Projection failed', { eventType: event.type, error: err });
            }
        }
    }
}
//# sourceMappingURL=projectEvents.js.map