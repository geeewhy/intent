"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLogger = void 0;
exports.getTestContext = getTestContext;
const stdLogger_1 = require("./stdLogger");
// Try to get caller file:line info (2 stack levels up)
function getPosition() {
    const err = new Error();
    const stackLine = err.stack?.split('\n')[3]; // Adjust stack depth if needed
    const match = stackLine?.match(/\(([^)]+)\)/);
    return match ? match[1] : 'unknown';
}
// Extract current test info using Jest globals
function getTestContext() {
    const caller = (0, stdLogger_1.getCallerInfo)(4);
    // Check if we're in a test context (expect is defined)
    if (typeof expect !== 'undefined') {
        try {
            const test = expect.getState();
            return {
                suite: test.currentTestName?.split(' ')[0],
                test: test.currentTestName,
                sourceURI: `file://${caller.position}`,
                operation: caller.function,
            };
        }
        catch (e) {
            // If expect.getState() fails, fall back to basic context
        }
    }
    // Default context when not in a test or expect.getState() fails
    return {
        suite: 'setup',
        test: 'initialization',
        sourceURI: `file://${caller.position}`,
        operation: caller.function,
    };
}
// Wrap stdLogger with dynamic per-test context injection
exports.testLogger = {
    info: (msg, ctx) => stdLogger_1.stdLogger.info(msg, { ...ctx, ...getTestContext() }),
    warn: (msg, ctx) => stdLogger_1.stdLogger.warn(msg, { ...ctx, ...getTestContext() }),
    error: (msg, ctx) => stdLogger_1.stdLogger.error(msg, { ...ctx, ...getTestContext() }),
    debug: (msg, ctx) => stdLogger_1.stdLogger.debug(msg, { ...ctx, ...getTestContext() }),
    child: (ctx) => {
        const base = stdLogger_1.stdLogger.child({ ...ctx, ...getTestContext() });
        return {
            info: (msg, c) => base.info(msg, { ...c, ...getTestContext() }),
            warn: (msg, c) => base.warn(msg, { ...c, ...getTestContext() }),
            error: (msg, c) => base.error(msg, { ...c, ...getTestContext() }),
            debug: (msg, c) => base.debug(msg, { ...c, ...getTestContext() }),
            child: (nestedCtx) => exports.testLogger.child({ ...ctx, ...nestedCtx }),
        };
    },
};
//# sourceMappingURL=testLogger.js.map