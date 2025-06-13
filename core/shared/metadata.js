"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inheritMetadata = inheritMetadata;
function inheritMetadata(input, ctx, extendMetadata) {
    return {
        userId: input.metadata?.userId,
        timestamp: new Date(),
        correlationId: input.metadata?.correlationId || input.id,
        causationId: input.id,
        requestId: ctx.getHint?.('requestId'),
        source: extendMetadata?.source ?? 'unknown',
        ...extendMetadata,
    };
}
//# sourceMappingURL=metadata.js.map