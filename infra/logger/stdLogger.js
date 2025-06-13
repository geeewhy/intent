"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stdLogger = exports.errorSerializer = void 0;
exports.getCallerInfo = getCallerInfo;
const pino_1 = __importDefault(require("pino"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';
// Configure error serialization for better error handling
/**
 * Custom error serializer for structured logging (e.g. Pino).
 * Preserves standard fields and safely includes custom ones like `details`, `retryable`, etc.
 */
const errorSerializer = (err) => {
    if (!err)
        return { name: 'Error', message: 'Unknown error' };
    const base = {
        name: typeof err === 'object' && 'name' in err ? err.name : 'Error',
        message: typeof err === 'object' && 'message' in err ? err.message : String(err),
        stack: typeof err === 'object' && 'stack' in err ? err.stack : undefined,
    };
    // Extract additional fields safely
    const instanceProps = {};
    try {
        const allKeys = [
            ...Object.getOwnPropertyNames(err),
            ...Object.keys(err), // catches enumerable properties set on the instance
        ];
        for (const key of new Set(allKeys)) {
            if (key === 'name' || key === 'message' || key === 'stack')
                continue;
            try {
                instanceProps[key] = err[key];
            }
            catch (accessErr) {
                instanceProps[key] = 'Error accessing property';
            }
        }
    }
    catch {
        // fallback if anything explodes
        instanceProps['details'] = {
            "message": "Exception: cant serialize props"
        };
    }
    return { ...base, ...instanceProps };
};
exports.errorSerializer = errorSerializer;
// Function to get caller information from stack trace
function getCallerInfo(depth = 3) {
    const err = new Error();
    const stackLine = err.stack?.split('\n')[depth];
    const match = stackLine?.match(/\s*at\s+(.*)\s+\((.*):(\d+):(\d+)\)/)
        || stackLine?.match(/\s*at\s+(.*):(\d+):(\d+)/); // fallback: anonymous
    if (!match) {
        return {
            function: 'unknown',
            file: 'unknown',
            line: '0',
            column: '0',
            position: 'unknown:0:0',
        };
    }
    if (match.length === 5) {
        const [, fn, file, line, column] = match;
        return {
            function: fn,
            file,
            line,
            column,
            position: `${file}:${line}:${column}`,
        };
    }
    if (match.length === 4) {
        const [, file, line, column] = match;
        return {
            function: 'anonymous',
            file,
            line,
            column,
            position: `${file}:${line}:${column}`,
        };
    }
    return {
        function: 'unknown',
        file: 'unknown',
        line: '0',
        column: '0',
        position: 'unknown:0:0',
    };
}
// Configure destinations - errors to stderr if needed
const destinations = [];
if (process.env.LOG_ERRORS_TO_STDERR === 'true') {
    // Create a stream for errors that goes to stderr
    const errorStream = pino_1.default.destination(2);
    destinations.push({
        level: 'error',
        stream: errorStream
    });
    // Create a stream for non-errors that goes to stdout
    const stdoutStream = pino_1.default.destination(1);
    destinations.push({
        level: 'info',
        stream: stdoutStream,
        filter: (obj) => obj.level < 50 // 50 is the 'error' level in pino
    });
}
// Base logger configuration
const baseLoggerConfig = {
    name: 'temporal-worker',
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        bindings: (bindings) => ({ pid: bindings.pid }),
        level: (label) => ({ level: label }),
    },
    serializers: {
        error: exports.errorSerializer,
    },
    // Standard context fields that should be included in all logs
    base: {
        app: 'temporal-worker',
        env: process.env.NODE_ENV || 'development',
    },
    // Add timestamp with ISO format
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
};
// Create the base logger
const baseLogger = destinations.length > 0
    ? (0, pino_1.default)(baseLoggerConfig, pino_1.default.multistream(destinations))
    : isDev
        ? (0, pino_1.default)(baseLoggerConfig, pino_1.default.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }))
        : (0, pino_1.default)(baseLoggerConfig);
// Create the standard logger that implements LoggerPort
exports.stdLogger = {
    info: (msg, ctx) => {
        const callerInfo = getCallerInfo();
        baseLogger.info({ ...ctx, operation: ctx?.operation || `${callerInfo.function}` }, msg);
    },
    warn: (msg, ctx) => {
        const callerInfo = getCallerInfo();
        baseLogger.warn({ ...ctx, operation: ctx?.operation || `${callerInfo.function}` }, msg);
    },
    error: (msg, ctx) => {
        const callerInfo = getCallerInfo();
        baseLogger.error({ ...ctx, operation: ctx?.operation || `${callerInfo.function}`, error: ctx?.error }, msg);
    },
    debug: (msg, ctx) => {
        const callerInfo = getCallerInfo();
        baseLogger.debug({ ...ctx, operation: ctx?.operation || `${callerInfo.function}` }, msg);
    },
    child: (ctx) => {
        const childLogger = baseLogger.child(ctx);
        return {
            info: (msg, additionalCtx) => {
                const callerInfo = getCallerInfo();
                childLogger.info({ ...additionalCtx, operation: additionalCtx?.operation || `${callerInfo.function}` }, msg);
            },
            warn: (msg, additionalCtx) => {
                const callerInfo = getCallerInfo();
                childLogger.warn({ ...additionalCtx, operation: additionalCtx?.operation || `${callerInfo.function}` }, msg);
            },
            error: (msg, additionalCtx) => {
                const callerInfo = getCallerInfo();
                childLogger.error({
                    ...additionalCtx,
                    operation: additionalCtx?.operation || `${callerInfo.function}`,
                    error: additionalCtx?.error
                }, msg);
            },
            debug: (msg, additionalCtx) => {
                const callerInfo = getCallerInfo();
                childLogger.debug({ ...additionalCtx, operation: additionalCtx?.operation || `${callerInfo.function}` }, msg);
            },
            child: (nestedCtx) => {
                return exports.stdLogger.child({ ...ctx, ...nestedCtx });
            },
        };
    },
};
//# sourceMappingURL=stdLogger.js.map