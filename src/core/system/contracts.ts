// src/core/system/contracts.ts
/**
 * Core system contracts for commands and events
 */

export type UUID = string;

/**
 * System-specific command types
 */
export enum SystemCommandType {
  LOG_MESSAGE = 'logMessage',
  SIMULATE_FAILURE = 'simulateFailure',
  EMIT_MULTIPLE_EVENTS = 'emitMultipleEvents',
  EXECUTE_TEST = 'executeTest',
  EXECUTE_RETRYABLE_TEST = 'executeRetryableTest',
}

/**
 * System-specific event types
 */
export enum SystemEventType {
  MESSAGE_LOGGED = 'messageLogged',
  FAILURE_SIMULATED = 'failureSimulated',
  MULTI_EVENT_EMITTED = 'multiEventEmitted',
  TEST_EXECUTED = 'testExecuted',
  RETRYABLE_TEST_EXECUTED = 'retryableTestExecuted',
}

/**
 * System command payloads
 */
export interface LogMessagePayload {
  message: string;
  systemId?: UUID;
}

export interface SimulateFailurePayload {
  systemId?: UUID;
}

export interface EmitMultipleEventsPayload {
  count: number;
  systemId?: UUID;
}

export interface ExecuteTestPayload {
  testId: UUID;
  testName: string;
  systemId?: UUID;
  parameters?: Record<string, any>;
}

export interface ExecuteRetryableTestPayload {
  testId: UUID;
  testName: string;
  systemId?: UUID;
  parameters?: Record<string, any>;
}

/**
 * System event payloads
 */
export interface MessageLoggedPayload {
  message: string;
  systemId?: UUID;
}

export interface FailureSimulatedPayload {
  systemId?: UUID;
}

export interface MultiEventEmittedPayload {
  index: number;
  systemId?: UUID;
}

export interface TestExecutedPayload {
  testId: UUID;
  testName: string;
  result: 'success' | 'failure';
  executedAt: Date;
  numberExecutedTests: number;
  systemId?: UUID;
  parameters?: Record<string, any>;
}

export interface RetryableTestExecutedPayload {
  testId: UUID;
  testName: string;
  result: 'success';
  executedAt: Date;
  systemId?: UUID;
  parameters?: Record<string, any>;
}

/**
 * Union types (optional if not needed elsewhere)
 */
export type SystemCommandPayload =
    | LogMessagePayload
    | SimulateFailurePayload
    | EmitMultipleEventsPayload
    | ExecuteTestPayload
    | ExecuteRetryableTestPayload;

export type SystemEventPayload =
    | MessageLoggedPayload
    | FailureSimulatedPayload
    | MultiEventEmittedPayload
    | TestExecutedPayload
    | RetryableTestExecutedPayload;
