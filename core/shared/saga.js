"use strict";
// core/shared/saga.ts
// Utility for building delayed commands used by multiple sagas
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDelayedCommand = buildDelayedCommand;
const metadata_1 = require("./metadata");
/**
 * Helper to create a delayed command from a saga or process manager context.
 */
async function buildDelayedCommand(ctx, tenantId, type, payload, delayMs, input, metadata) {
    const inheritedMetadata = (0, metadata_1.inheritMetadata)(input, ctx, {
        timestamp: new Date(Date.now() + delayMs),
        source: ctx.constructor?.name ?? 'unknown',
        ...metadata,
    });
    const cmd = {
        id: await ctx.nextId(),
        tenant_id: tenantId,
        type,
        payload,
        metadata: inheritedMetadata,
    };
    return { cmd, ms: delayMs };
}
//# sourceMappingURL=saga.js.map