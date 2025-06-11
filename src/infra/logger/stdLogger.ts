import pino from 'pino';
import dotenv from 'dotenv';
import {LoggerPort} from '../../core/ports';

dotenv.config();

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Configure error serialization for better error handling
/**
 * Custom error serializer for structured logging (e.g. Pino).
 * Preserves standard fields and safely includes custom ones like `details`, `retryable`, etc.
 */
export const errorSerializer = (err: Error): Record<string, unknown> => {
  if (!err) return { name: 'Error', message: 'Unknown error' };

  const base = {
    name: typeof err === 'object' && 'name' in err ? (err as any).name : 'Error',
    message: typeof err === 'object' && 'message' in err ? (err as any).message : String(err),
    stack: typeof err === 'object' && 'stack' in err ? (err as any).stack : undefined,
  };

  // Extract additional fields safely
  const instanceProps: Record<string, unknown> = {};

  try {
    const allKeys = [
      ...Object.getOwnPropertyNames(err),
      ...Object.keys(err), // catches enumerable properties set on the instance
    ];

    for (const key of new Set(allKeys)) {
      if (key === 'name' || key === 'message' || key === 'stack') continue;
      try {
        instanceProps[key] = (err as any)[key];
      } catch (accessErr) {
        instanceProps[key] = 'Error accessing property';
      }
    }
  } catch {
    // fallback if anything explodes
    instanceProps['details'] = {
      "message": "Exception: cant serialize props"
    };
  }

  return {...base, ...instanceProps};
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
