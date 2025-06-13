"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemEventType = exports.SystemCommandType = void 0;
/**
 * System-specific command types
 */
var SystemCommandType;
(function (SystemCommandType) {
    SystemCommandType["LOG_MESSAGE"] = "logMessage";
    SystemCommandType["SIMULATE_FAILURE"] = "simulateFailure";
    SystemCommandType["EMIT_MULTIPLE_EVENTS"] = "emitMultipleEvents";
    SystemCommandType["EXECUTE_TEST"] = "executeTest";
    SystemCommandType["EXECUTE_RETRYABLE_TEST"] = "executeRetryableTest";
})(SystemCommandType || (exports.SystemCommandType = SystemCommandType = {}));
/**
 * System-specific event types
 */
var SystemEventType;
(function (SystemEventType) {
    SystemEventType["MESSAGE_LOGGED"] = "messageLogged";
    SystemEventType["FAILURE_SIMULATED"] = "failureSimulated";
    SystemEventType["MULTI_EVENT_EMITTED"] = "multiEventEmitted";
    SystemEventType["TEST_EXECUTED"] = "testExecuted";
    SystemEventType["RETRYABLE_TEST_EXECUTED"] = "retryableTestExecuted";
})(SystemEventType || (exports.SystemEventType = SystemEventType = {}));
//# sourceMappingURL=contracts.js.map