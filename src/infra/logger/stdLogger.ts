import pino from 'pino';
import dotenv from 'dotenv';
import { LoggerPort } from '../../core/ports';

dotenv.config();

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Configure error serialization for better error handling
const errorSerializer = (err: any) => {
  if (!err) return err;

  // Handle both Error objects and plain objects with error properties
  const base = {
    message: err.message || (typeof err === 'string' ? err : 'Unknown error'),
    name: err.name || 'Error',
    stack: err.stack,
  };

  // Add enumerable properties from the error object
  const enumProps = Object.getOwnPropertyNames(err).reduce((acc, key) => {
    if (key !== 'message' && key !== 'name' && key !== 'stack') {
      try {
        acc[key] = err[key];
      } catch (e) {
        acc[key] = 'Error accessing property';
      }
    }
    return acc;
  }, {} as Record<string, any>);

  return { ...base, ...enumProps };
};

// Function to get caller information from stack trace
export function getCallerInfo(depth = 3): {
  function: string;
  file: string;
  line: string;
  column: string;
  position: string;
} {
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
  const errorStream = pino.destination(2);
  destinations.push({
    level: 'error',
    stream: errorStream
  });

  // Create a stream for non-errors that goes to stdout
  const stdoutStream = pino.destination(1);
  destinations.push({
    level: 'info',
    stream: stdoutStream,
    filter: (obj: pino.LogDescriptor) => obj.level < 50 // 50 is the 'error' level in pino
  });
}

// Base logger configuration
const baseLoggerConfig = {
  name: 'temporal-worker',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    bindings: (bindings: pino.Bindings) => ({ pid: bindings.pid }),
    level: (label: string) => ({ level: label }),
  },
  serializers: {
    error: errorSerializer,
  },
  // Standard context fields that should be included in all logs
  base: {
    app: 'temporal-worker',
    env: process.env.NODE_ENV || 'development',
  },
  // Add timestamp with ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Create the base logger
const baseLogger = destinations.length > 0
  ? pino(baseLoggerConfig, pino.multistream(destinations))
  : isDev
    ? pino(baseLoggerConfig, pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }))
    : pino(baseLoggerConfig);

// Create the standard logger that implements LoggerPort
export const stdLogger: LoggerPort = {
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
        return stdLogger.child({ ...ctx, ...nestedCtx });
      },
    };
  },
};
