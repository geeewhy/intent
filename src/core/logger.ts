
/**
 * Logger accessor functions
 */
import type { LoggerPort } from './ports';
import type { CommandHandler, EventHandler } from './contracts';

let getLogger: (() => LoggerPort | undefined) | null = null;

export function setLoggerAccessor(fn: () => LoggerPort | undefined) {
    getLogger = fn;
}

export function log(): LoggerPort | undefined {
    return getLogger?.();
}

// Helper functions for handlers as examples in core

export function createLogger(): LoggerPort | undefined {
    const logger = log();
    if (!logger) return undefined;

    return logger.child({
        component: 'core'
    });
}

export function createLoggerForCommandHandler(handler: CommandHandler): LoggerPort | undefined {
    const logger = log();
    if (!logger) return undefined;

    return logger.child({
        component: 'commandHandler',
        handlerName: handler.constructor.name
    });
}

export function createLoggerForEventHandler(handler: EventHandler): LoggerPort | undefined {
    const logger = log();
    if (!logger) return undefined;

    return logger.child({
        component: 'eventHandler',
        handlerName: handler.constructor.name
    });
}

/**
 * Creates a logger for a saga
 * @param sagaClass The saga class
 * @returns A logger with saga-specific context
 */
export function createLoggerForSaga(sagaClass: any): LoggerPort | undefined {
    const logger = log();
    if (!logger) return undefined;

    return logger.child({
        component: 'saga',
        sagaName: sagaClass.name
    });
}

/**
 * Creates a logger for a projection
 * @param projectionName The name of the projection
 * @returns A logger with projection-specific context
 */
export function createLoggerForProjection(projectionName: string): LoggerPort | undefined {
    const logger = log();
    if (!logger) return undefined;

    return logger.child({
        component: 'projection',
        projectionName
    });
}
