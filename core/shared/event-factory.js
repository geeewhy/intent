"use strict";
// core/shared/event-factory.ts
// Generates events with standard metadata across domains
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEvent = buildEvent;
function buildEvent(tenantId, aggregateId, aggregateType, type, version, payload, metadata = {}) {
    return {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type,
        aggregateId,
        aggregateType,
        version,
        payload,
        metadata: {
            timestamp: new Date(),
            ...metadata,
        },
    };
}
//# sourceMappingURL=event-factory.js.map