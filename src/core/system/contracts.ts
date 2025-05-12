import { Command, Event, UUID } from '../contracts';

export enum SystemCommandType {
  LOG_MESSAGE = 'logMessage',
  SIMULATE_FAILURE = 'simulateFailure',
  EMIT_MULTIPLE_EVENTS = 'emitMultipleEvents',
  EXECUTE_TEST = 'executeTest',
  EXECUTE_RETRYABLE_TEST = 'executeRetryableTest',
}

export enum SystemEventType {
  MESSAGE_LOGGED = 'messageLogged',
  FAILURE_SIMULATED = 'failureSimulated',
  MULTI_EVENT_EMITTED = 'multiEventEmitted',
  TEST_EXECUTED = 'testExecuted',
  RETRYABLE_TEST_EXECUTED = 'retryableTestExecuted',
}

export interface LogMessagePayload {
  message: string;
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

export interface SimulateFailurePayload {
  systemId?: UUID;
}

export type SystemCommand =
  | Command<LogMessagePayload> & { type: SystemCommandType.LOG_MESSAGE }
  | Command<SimulateFailurePayload> & { type: SystemCommandType.SIMULATE_FAILURE }
  | Command<EmitMultipleEventsPayload> & { type: SystemCommandType.EMIT_MULTIPLE_EVENTS }
  | Command<ExecuteTestPayload> & { type: SystemCommandType.EXECUTE_TEST }
  | Command<ExecuteRetryableTestPayload> & { type: SystemCommandType.EXECUTE_RETRYABLE_TEST };

export interface MessageLoggedPayload extends LogMessagePayload {}

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
  result: 'success';
  numberExecutedTests: number;
  executedAt: Date;
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

export type SystemEvent = Event<any> & {
  type: SystemEventType;
  payload: MessageLoggedPayload | FailureSimulatedPayload | MultiEventEmittedPayload | TestExecutedPayload | RetryableTestExecutedPayload;
};
