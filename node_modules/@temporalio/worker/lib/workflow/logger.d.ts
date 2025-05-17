import { type LoggerSinksInternal } from '@temporalio/workflow/lib/logs';
import { type InjectedSinks } from '../sinks';
import { type Logger } from '../logger';
/**
 * Injects a logger sink that forwards to the worker's logger
 */
export declare function initLoggerSink(logger: Logger): InjectedSinks<LoggerSinksInternal>;
