/**
 * Core system contracts for commands and events
 */
import * as S from './payload-schemas';
export type UUID = string;
/**
 * System-specific command types
 */
export declare enum SystemCommandType {
    LOG_MESSAGE = "logMessage",
    SIMULATE_FAILURE = "simulateFailure",
    EMIT_MULTIPLE_EVENTS = "emitMultipleEvents",
    EXECUTE_TEST = "executeTest",
    EXECUTE_RETRYABLE_TEST = "executeRetryableTest"
}
/**
 * System-specific event types
 */
export declare enum SystemEventType {
    MESSAGE_LOGGED = "messageLogged",
    FAILURE_SIMULATED = "failureSimulated",
    MULTI_EVENT_EMITTED = "multiEventEmitted",
    TEST_EXECUTED = "testExecuted",
    RETRYABLE_TEST_EXECUTED = "retryableTestExecuted"
}
/**
 * Actors in the system
 */
export type SystemRole = 'tester' | 'system' | 'developer';
/**
 * System command payloads - derived from Zod schemas
 */
export type LogMessagePayload = S.LogMessagePayload;
export type SimulateFailurePayload = S.SimulateFailurePayload;
export type EmitMultipleEventsPayload = S.EmitMultipleEventsPayload;
export type ExecuteTestPayload = S.ExecuteTestPayload;
export type ExecuteRetryableTestPayload = S.ExecuteRetryableTestPayload;
/**
 * System event payloads - derived from Zod schemas
 */
export type MessageLoggedPayload = S.MessageLoggedPayload;
export type FailureSimulatedPayload = S.FailureSimulatedPayload;
export type MultiEventEmittedPayload = S.MultiEventEmittedPayload;
export type TestExecutedPayload = S.TestExecutedPayload;
export type RetryableTestExecutedPayload = S.RetryableTestExecutedPayload;
