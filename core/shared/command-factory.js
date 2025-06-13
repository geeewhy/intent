"use strict";
// core/shared/command-factory.ts
// Cross-domain utility to build commands with consistent metadata
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCommand = buildCommand;
exports.cloneMetadataFrom = cloneMetadataFrom;
function buildCommand(id, tenantId, type, payload, metadata = {}) {
    return {
        id,
        tenant_id: tenantId,
        type,
        payload,
        metadata: {
            timestamp: new Date(),
            ...metadata,
        },
    };
}
function cloneMetadataFrom(source, overrides) {
    return {
        userId: source.metadata?.userId,
        correlationId: source.metadata?.correlationId,
        causationId: source.metadata?.causationId,
        requestId: source.metadata?.requestId,
        source: source.metadata?.source,
        timestamp: new Date(),
        ...overrides,
    };
}
//# sourceMappingURL=command-factory.js.map