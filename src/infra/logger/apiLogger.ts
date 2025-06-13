import { stdLogger } from './stdLogger';
import { LoggerPort } from '../../core/ports';
import pino from 'pino';
import { broadcastLog } from './logBroadcaster';

const logger = pino({
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime
});

const baseLogger = stdLogger.child({
  module: 'api'
});

const wrappedLogger: LoggerPort = {
  info: (msg: string, meta?: any) => {
    // Use the original logger
    baseLogger.info(msg, meta);

    // Also broadcast the log for SSE
    broadcastLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: msg,
      category: meta?.operation ?? 'http',
      tenant_id: meta?.tenantId ?? 'unknown'
    });
  },
  warn: (msg: string, meta?: any) => {
    baseLogger.warn(msg, meta);

    // Also broadcast the warning log for SSE
    broadcastLog({
      timestamp: new Date().toISOString(),
      level: 'warning',
      message: msg,
      category: meta?.operation ?? 'http',
      tenant_id: meta?.tenantId ?? 'unknown'
    });
  },
  error: (msg: string, meta?: any) => {
    baseLogger.error(msg, meta);

    // Also broadcast the error log for SSE
    broadcastLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: msg,
      category: meta?.operation ?? 'http',
      tenant_id: meta?.tenantId ?? 'unknown'
    });
  },
  debug: (msg: string, meta?: any) => baseLogger.debug(msg, meta),
  child: (context: Record<string, unknown>) => baseLogger.child(context)
};

export const apiLogger: LoggerPort = wrappedLogger;
