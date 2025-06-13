"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLoggerAccessor = setLoggerAccessor;
exports.log = log;
exports.createLogger = createLogger;
exports.createLoggerForCommandHandler = createLoggerForCommandHandler;
exports.createLoggerForEventHandler = createLoggerForEventHandler;
exports.createLoggerForSaga = createLoggerForSaga;
exports.createLoggerForProjection = createLoggerForProjection;
let getLogger = null;
function setLoggerAccessor(fn) {
    getLogger = fn;
}
function log() {
    return getLogger?.();
}
// Helper functions for handlers as examples in core
function createLogger() {
    const logger = log();
    if (!logger)
        return undefined;
    return logger.child({
        component: 'core'
    });
}
function createLoggerForCommandHandler(handler) {
    const logger = log();
    if (!logger)
        return undefined;
    return logger.child({
        component: 'commandHandler',
        handlerName: handler.constructor.name
    });
}
function createLoggerForEventHandler(handler) {
    const logger = log();
    if (!logger)
        return undefined;
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
function createLoggerForSaga(sagaClass) {
    const logger = log();
    if (!logger)
        return undefined;
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
function createLoggerForProjection(projectionName) {
    const logger = log();
    if (!logger)
        return undefined;
    return logger.child({
        component: 'projection',
        projectionName
    });
}
//# sourceMappingURL=logger.js.map