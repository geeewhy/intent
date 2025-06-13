/**
 * Logger accessor functions
 */
import type { LoggerPort } from './ports';
import type { CommandHandler, EventHandler } from './contracts';
export declare function setLoggerAccessor(fn: () => LoggerPort | undefined): void;
export declare function log(): LoggerPort | undefined;
export declare function createLogger(): LoggerPort | undefined;
export declare function createLoggerForCommandHandler(handler: CommandHandler): LoggerPort | undefined;
export declare function createLoggerForEventHandler(handler: EventHandler): LoggerPort | undefined;
/**
 * Creates a logger for a saga
 * @param sagaClass The saga class
 * @returns A logger with saga-specific context
 */
export declare function createLoggerForSaga(sagaClass: any): LoggerPort | undefined;
/**
 * Creates a logger for a projection
 * @param projectionName The name of the projection
 * @returns A logger with projection-specific context
 */
export declare function createLoggerForProjection(projectionName: string): LoggerPort | undefined;
