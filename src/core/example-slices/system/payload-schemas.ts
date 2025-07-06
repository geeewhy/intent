//src/core/system/payload-schemas.ts
import { z } from 'zod';
import { SystemCommandType, SystemEventType } from './contracts';

// -- commands

export const LogMessagePayloadSchema = z.object({
  message: z.string(),
  systemId: z.string().uuid().optional(), // todo singleton ids = validation trouble. see aggregate code for the ='system' hack
});
export type LogMessagePayload = z.infer<typeof LogMessagePayloadSchema>;

export const SimulateFailurePayloadSchema = z.object({
  aggregateId: z.string(),
  systemId: z.string().uuid().optional(),
});
export type SimulateFailurePayload = z.infer<typeof SimulateFailurePayloadSchema>;

//todo rest are NOT DEVX compatible / reflect reality re aggregateType and Id in payloads. need to decide:
// - before handler, caller figures out aggregate type and prefill
//    - options: command-bus, scheduler
//    - good: easy wiring
//    - bad: implicit / can look like magic
// - Define shared payload
//     - good: explicit
//     - bad: CMDs can be cross cutting aggregates, although rare and can be handled with override exceptions

export const EmitMultipleEventsPayloadSchema = z.object({
  count: z.number(),
  systemId: z.string().uuid().optional(),
});
export type EmitMultipleEventsPayload = z.infer<typeof EmitMultipleEventsPayloadSchema>;

export const ExecuteTestPayloadSchema = z.object({
  testId: z.string().uuid(),
  testName: z.string(),
  systemId: z.string().uuid().optional(),
  parameters: z.record(z.any()).optional(),
});
export type ExecuteTestPayload = z.infer<typeof ExecuteTestPayloadSchema>;

export const ExecuteRetryableTestPayloadSchema = z.object({
  testId: z.string().uuid(),
  testName: z.string(),
  systemId: z.string().uuid().optional(),
  parameters: z.record(z.any()).optional(),
});
export type ExecuteRetryableTestPayload = z.infer<typeof ExecuteRetryableTestPayloadSchema>;

// -- events

export const MessageLoggedPayloadSchema = z.object({
  message: z.string(),
  systemId: z.string().uuid().optional(),
});
export type MessageLoggedPayload = z.infer<typeof MessageLoggedPayloadSchema>;

export const FailureSimulatedPayloadSchema = z.object({
  systemId: z.string().uuid().optional(),
});
export type FailureSimulatedPayload = z.infer<typeof FailureSimulatedPayloadSchema>;

export const MultiEventEmittedPayloadSchema = z.object({
  index: z.number(),
  systemId: z.string().uuid().optional(),
});
export type MultiEventEmittedPayload = z.infer<typeof MultiEventEmittedPayloadSchema>;

export const TestExecutedPayloadSchema = z.object({
  testId: z.string().uuid(),
  testName: z.string(),
  testerId: z.string().uuid(),
  result: z.enum(['success', 'failure']),
  executedAt: z.date(),
  numberExecutedTests: z.number(),
  systemId: z.string().uuid().optional(),
  parameters: z.record(z.any()).optional(),
});
export type TestExecutedPayload = z.infer<typeof TestExecutedPayloadSchema>;

export const RetryableTestExecutedPayloadSchema = z.object({
  testId: z.string().uuid(),
  testName: z.string(),
  result: z.literal('success'),
  executedAt: z.date(),
  systemId: z.string().uuid().optional(),
  parameters: z.record(z.any()).optional(),
});
export type RetryableTestExecutedPayload = z.infer<typeof RetryableTestExecutedPayloadSchema>;

// registry glue

export const commandPayloadSchemas = {
  [SystemCommandType.LOG_MESSAGE]: LogMessagePayloadSchema,
  [SystemCommandType.SIMULATE_FAILURE]: SimulateFailurePayloadSchema,
  [SystemCommandType.EMIT_MULTIPLE_EVENTS]: EmitMultipleEventsPayloadSchema,
  [SystemCommandType.EXECUTE_TEST]: ExecuteTestPayloadSchema,
  [SystemCommandType.EXECUTE_RETRYABLE_TEST]: ExecuteRetryableTestPayloadSchema,
} as const;

export const eventPayloadSchemas = {
  [SystemEventType.MESSAGE_LOGGED]: MessageLoggedPayloadSchema,
  [SystemEventType.FAILURE_SIMULATED]: FailureSimulatedPayloadSchema,
  [SystemEventType.MULTI_EVENT_EMITTED]: MultiEventEmittedPayloadSchema,
  [SystemEventType.TEST_EXECUTED]: TestExecutedPayloadSchema,
  [SystemEventType.RETRYABLE_TEST_EXECUTED]: RetryableTestExecutedPayloadSchema,
} as const;