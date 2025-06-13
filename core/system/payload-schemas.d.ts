import { z } from 'zod';
export declare const LogMessagePayloadSchema: z.ZodObject<{
    message: z.ZodString;
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    systemId?: string | undefined;
}, {
    message: string;
    systemId?: string | undefined;
}>;
export type LogMessagePayload = z.infer<typeof LogMessagePayloadSchema>;
export declare const SimulateFailurePayloadSchema: z.ZodObject<{
    aggregateId: z.ZodString;
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    aggregateId: string;
    systemId?: string | undefined;
}, {
    aggregateId: string;
    systemId?: string | undefined;
}>;
export type SimulateFailurePayload = z.infer<typeof SimulateFailurePayloadSchema>;
export declare const EmitMultipleEventsPayloadSchema: z.ZodObject<{
    count: z.ZodNumber;
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    count: number;
    systemId?: string | undefined;
}, {
    count: number;
    systemId?: string | undefined;
}>;
export type EmitMultipleEventsPayload = z.infer<typeof EmitMultipleEventsPayloadSchema>;
export declare const ExecuteTestPayloadSchema: z.ZodObject<{
    testId: z.ZodString;
    testName: z.ZodString;
    systemId: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    testId: string;
    testName: string;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}, {
    testId: string;
    testName: string;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}>;
export type ExecuteTestPayload = z.infer<typeof ExecuteTestPayloadSchema>;
export declare const ExecuteRetryableTestPayloadSchema: z.ZodObject<{
    testId: z.ZodString;
    testName: z.ZodString;
    systemId: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    testId: string;
    testName: string;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}, {
    testId: string;
    testName: string;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}>;
export type ExecuteRetryableTestPayload = z.infer<typeof ExecuteRetryableTestPayloadSchema>;
export declare const MessageLoggedPayloadSchema: z.ZodObject<{
    message: z.ZodString;
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    systemId?: string | undefined;
}, {
    message: string;
    systemId?: string | undefined;
}>;
export type MessageLoggedPayload = z.infer<typeof MessageLoggedPayloadSchema>;
export declare const FailureSimulatedPayloadSchema: z.ZodObject<{
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    systemId?: string | undefined;
}, {
    systemId?: string | undefined;
}>;
export type FailureSimulatedPayload = z.infer<typeof FailureSimulatedPayloadSchema>;
export declare const MultiEventEmittedPayloadSchema: z.ZodObject<{
    index: z.ZodNumber;
    systemId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    index: number;
    systemId?: string | undefined;
}, {
    index: number;
    systemId?: string | undefined;
}>;
export type MultiEventEmittedPayload = z.infer<typeof MultiEventEmittedPayloadSchema>;
export declare const TestExecutedPayloadSchema: z.ZodObject<{
    testId: z.ZodString;
    testName: z.ZodString;
    testerId: z.ZodString;
    result: z.ZodEnum<["success", "failure"]>;
    executedAt: z.ZodDate;
    numberExecutedTests: z.ZodNumber;
    systemId: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    testId: string;
    testName: string;
    testerId: string;
    result: "success" | "failure";
    executedAt: Date;
    numberExecutedTests: number;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}, {
    testId: string;
    testName: string;
    testerId: string;
    result: "success" | "failure";
    executedAt: Date;
    numberExecutedTests: number;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}>;
export type TestExecutedPayload = z.infer<typeof TestExecutedPayloadSchema>;
export declare const RetryableTestExecutedPayloadSchema: z.ZodObject<{
    testId: z.ZodString;
    testName: z.ZodString;
    result: z.ZodLiteral<"success">;
    executedAt: z.ZodDate;
    systemId: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    testId: string;
    testName: string;
    result: "success";
    executedAt: Date;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}, {
    testId: string;
    testName: string;
    result: "success";
    executedAt: Date;
    systemId?: string | undefined;
    parameters?: Record<string, any> | undefined;
}>;
export type RetryableTestExecutedPayload = z.infer<typeof RetryableTestExecutedPayloadSchema>;
export declare const commandPayloadSchemas: {
    readonly logMessage: z.ZodObject<{
        message: z.ZodString;
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        systemId?: string | undefined;
    }, {
        message: string;
        systemId?: string | undefined;
    }>;
    readonly simulateFailure: z.ZodObject<{
        aggregateId: z.ZodString;
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        aggregateId: string;
        systemId?: string | undefined;
    }, {
        aggregateId: string;
        systemId?: string | undefined;
    }>;
    readonly emitMultipleEvents: z.ZodObject<{
        count: z.ZodNumber;
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        count: number;
        systemId?: string | undefined;
    }, {
        count: number;
        systemId?: string | undefined;
    }>;
    readonly executeTest: z.ZodObject<{
        testId: z.ZodString;
        testName: z.ZodString;
        systemId: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        testId: string;
        testName: string;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }, {
        testId: string;
        testName: string;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }>;
    readonly executeRetryableTest: z.ZodObject<{
        testId: z.ZodString;
        testName: z.ZodString;
        systemId: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        testId: string;
        testName: string;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }, {
        testId: string;
        testName: string;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }>;
};
export declare const eventPayloadSchemas: {
    readonly messageLogged: z.ZodObject<{
        message: z.ZodString;
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        systemId?: string | undefined;
    }, {
        message: string;
        systemId?: string | undefined;
    }>;
    readonly failureSimulated: z.ZodObject<{
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        systemId?: string | undefined;
    }, {
        systemId?: string | undefined;
    }>;
    readonly multiEventEmitted: z.ZodObject<{
        index: z.ZodNumber;
        systemId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        index: number;
        systemId?: string | undefined;
    }, {
        index: number;
        systemId?: string | undefined;
    }>;
    readonly testExecuted: z.ZodObject<{
        testId: z.ZodString;
        testName: z.ZodString;
        testerId: z.ZodString;
        result: z.ZodEnum<["success", "failure"]>;
        executedAt: z.ZodDate;
        numberExecutedTests: z.ZodNumber;
        systemId: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        testId: string;
        testName: string;
        testerId: string;
        result: "success" | "failure";
        executedAt: Date;
        numberExecutedTests: number;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }, {
        testId: string;
        testName: string;
        testerId: string;
        result: "success" | "failure";
        executedAt: Date;
        numberExecutedTests: number;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }>;
    readonly retryableTestExecuted: z.ZodObject<{
        testId: z.ZodString;
        testName: z.ZodString;
        result: z.ZodLiteral<"success">;
        executedAt: z.ZodDate;
        systemId: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        testId: string;
        testName: string;
        result: "success";
        executedAt: Date;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }, {
        testId: string;
        testName: string;
        result: "success";
        executedAt: Date;
        systemId?: string | undefined;
        parameters?: Record<string, any> | undefined;
    }>;
};
