import { LoggerPort } from '../../core/ports';
import { stdLogger, getCallerInfo } from './stdLogger';
import { setLoggerAccessor } from '../../core/logger';

// Try to get caller file:line info (2 stack levels up)
function getPosition(): string {
  const err = new Error();
  const stackLine = err.stack?.split('\n')[3]; // Adjust stack depth if needed
  const match = stackLine?.match(/\(([^)]+)\)/);
  return match ? match[1] : 'unknown';
}

// Extract current test info using Jest globals
export function getTestContext(): Record<string, unknown> {
  const test = expect.getState();
  const caller = getCallerInfo(4);

  return {
    suite: test.currentTestName?.split(' ')[0],
    test: test.currentTestName,
    sourceURI: `file://${caller.position}`,
    operation: caller.function,
  };
}


// Wrap stdLogger with dynamic per-test context injection
export const testLogger: LoggerPort = {
  info: (msg, ctx) => stdLogger.info(msg, { ...ctx, ...getTestContext() }),
  warn: (msg, ctx) => stdLogger.warn(msg, { ...ctx, ...getTestContext() }),
  error: (msg, ctx) => stdLogger.error(msg, { ...ctx, ...getTestContext() }),
  debug: (msg, ctx) => stdLogger.debug(msg, { ...ctx, ...getTestContext() }),
  child: (ctx) => {
    const base = stdLogger.child({ ...ctx, ...getTestContext() });
    return {
      info: (msg, c) => base.info(msg, { ...c, ...getTestContext() }),
      warn: (msg, c) => base.warn(msg, { ...c, ...getTestContext() }),
      error: (msg, c) => base.error(msg, { ...c, ...getTestContext() }),
      debug: (msg, c) => base.debug(msg, { ...c, ...getTestContext() }),
      child: (nestedCtx) => testLogger.child({ ...ctx, ...nestedCtx }),
    };
  },
};