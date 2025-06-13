"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPayloadSchemas = exports.commandPayloadSchemas = exports.RetryableTestExecutedPayloadSchema = exports.TestExecutedPayloadSchema = exports.MultiEventEmittedPayloadSchema = exports.FailureSimulatedPayloadSchema = exports.MessageLoggedPayloadSchema = exports.ExecuteRetryableTestPayloadSchema = exports.ExecuteTestPayloadSchema = exports.EmitMultipleEventsPayloadSchema = exports.SimulateFailurePayloadSchema = exports.LogMessagePayloadSchema = void 0;
//src/core/system/payload-schemas.ts
const zod_1 = require("zod");
const contracts_1 = require("./contracts");
// -- commands
exports.LogMessagePayloadSchema = zod_1.z.object({
    message: zod_1.z.string(),
    systemId: zod_1.z.string().uuid().optional(), // todo singleton ids = validation trouble. see aggregate code for the ='system' hack
});
exports.SimulateFailurePayloadSchema = zod_1.z.object({
    aggregateId: zod_1.z.string(),
    systemId: zod_1.z.string().uuid().optional(),
});
//todo rest are NOT DEVX compatible / reflect reality re aggregateType and Id in payloads. need to decide:
// - before handler, caller figures out aggregate type and prefill
//    - options: command-bus, scheduler
//    - good: easy wiring
//    - bad: implicit / can look like magic
// - Define shared payload
//     - good: explicit
//     - bad: CMDs can be cross cutting aggregates, although rare and can be handled with override exceptions
exports.EmitMultipleEventsPayloadSchema = zod_1.z.object({
    count: zod_1.z.number(),
    systemId: zod_1.z.string().uuid().optional(),
});
exports.ExecuteTestPayloadSchema = zod_1.z.object({
    testId: zod_1.z.string().uuid(),
    testName: zod_1.z.string(),
    systemId: zod_1.z.string().uuid().optional(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ExecuteRetryableTestPayloadSchema = zod_1.z.object({
    testId: zod_1.z.string().uuid(),
    testName: zod_1.z.string(),
    systemId: zod_1.z.string().uuid().optional(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
// -- events
exports.MessageLoggedPayloadSchema = zod_1.z.object({
    message: zod_1.z.string(),
    systemId: zod_1.z.string().uuid().optional(),
});
exports.FailureSimulatedPayloadSchema = zod_1.z.object({
    systemId: zod_1.z.string().uuid().optional(),
});
exports.MultiEventEmittedPayloadSchema = zod_1.z.object({
    index: zod_1.z.number(),
    systemId: zod_1.z.string().uuid().optional(),
});
exports.TestExecutedPayloadSchema = zod_1.z.object({
    testId: zod_1.z.string().uuid(),
    testName: zod_1.z.string(),
    testerId: zod_1.z.string().uuid(),
    result: zod_1.z.enum(['success', 'failure']),
    executedAt: zod_1.z.date(),
    numberExecutedTests: zod_1.z.number(),
    systemId: zod_1.z.string().uuid().optional(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.RetryableTestExecutedPayloadSchema = zod_1.z.object({
    testId: zod_1.z.string().uuid(),
    testName: zod_1.z.string(),
    result: zod_1.z.literal('success'),
    executedAt: zod_1.z.date(),
    systemId: zod_1.z.string().uuid().optional(),
    parameters: zod_1.z.record(zod_1.z.any()).optional(),
});
// registry glue
exports.commandPayloadSchemas = {
    [contracts_1.SystemCommandType.LOG_MESSAGE]: exports.LogMessagePayloadSchema,
    [contracts_1.SystemCommandType.SIMULATE_FAILURE]: exports.SimulateFailurePayloadSchema,
    [contracts_1.SystemCommandType.EMIT_MULTIPLE_EVENTS]: exports.EmitMultipleEventsPayloadSchema,
    [contracts_1.SystemCommandType.EXECUTE_TEST]: exports.ExecuteTestPayloadSchema,
    [contracts_1.SystemCommandType.EXECUTE_RETRYABLE_TEST]: exports.ExecuteRetryableTestPayloadSchema,
};
exports.eventPayloadSchemas = {
    [contracts_1.SystemEventType.MESSAGE_LOGGED]: exports.MessageLoggedPayloadSchema,
    [contracts_1.SystemEventType.FAILURE_SIMULATED]: exports.FailureSimulatedPayloadSchema,
    [contracts_1.SystemEventType.MULTI_EVENT_EMITTED]: exports.MultiEventEmittedPayloadSchema,
    [contracts_1.SystemEventType.TEST_EXECUTED]: exports.TestExecutedPayloadSchema,
    [contracts_1.SystemEventType.RETRYABLE_TEST_EXECUTED]: exports.RetryableTestExecutedPayloadSchema,
};
//# sourceMappingURL=payload-schemas.js.map