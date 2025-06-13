"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLogger = void 0;
const stdLogger_1 = require("./stdLogger");
const pino_1 = __importDefault(require("pino"));
const logBroadcaster_1 = require("./logBroadcaster");
const logger = (0, pino_1.default)({
    level: 'info',
    timestamp: pino_1.default.stdTimeFunctions.isoTime
});
const baseLogger = stdLogger_1.stdLogger.child({
    module: 'api'
});
const wrappedLogger = {
    info: (msg, meta) => {
        // Use the original logger
        baseLogger.info(msg, meta);
        // Also broadcast the log for SSE
        (0, logBroadcaster_1.broadcastLog)({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: msg,
            category: meta?.operation ?? 'http',
            tenant_id: meta?.tenantId ?? 'unknown',
            meta: meta // Include the full metadata
        });
    },
    warn: (msg, meta) => {
        baseLogger.warn(msg, meta);
        // Also broadcast the warning log for SSE
        (0, logBroadcaster_1.broadcastLog)({
            timestamp: new Date().toISOString(),
            level: 'warning',
            message: msg,
            category: meta?.operation ?? 'http',
            tenant_id: meta?.tenantId ?? 'unknown',
            meta: meta // Include the full metadata
        });
    },
    error: (msg, meta) => {
        baseLogger.error(msg, meta);
        // Also broadcast the error log for SSE
        (0, logBroadcaster_1.broadcastLog)({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: msg,
            category: meta?.operation ?? 'http',
            tenant_id: meta?.tenantId ?? 'unknown',
            meta: meta // Include the full metadata
        });
    },
    debug: (msg, meta) => baseLogger.debug(msg, meta),
    child: (context) => baseLogger.child(context)
};
exports.apiLogger = wrappedLogger;
//# sourceMappingURL=apiLogger.js.map