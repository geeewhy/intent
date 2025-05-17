"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTlsConfig = normalizeTlsConfig;
/**
 * Normalize {@link TLSConfigOption} by turning false and null to undefined and true to and empty object
 */
function normalizeTlsConfig(tls) {
    return typeof tls === 'object' ? (tls === null ? undefined : tls) : tls ? {} : undefined;
}
//# sourceMappingURL=tls-config.js.map