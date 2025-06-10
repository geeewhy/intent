import { stdLogger } from './stdLogger';
import { LoggerPort } from '../../core/ports';

export const apiLogger: LoggerPort = stdLogger.child({
  module: 'api',
  layer: 'access',
});