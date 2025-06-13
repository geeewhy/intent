export declare class BusinessRuleViolation extends Error {
    readonly message: string;
    readonly retryable: boolean;
    readonly details?: Record<string, unknown>;
    constructor(message: string, details?: Record<string, unknown>, retryable?: boolean);
    toJSON(): {
        name: string;
        message: string;
        stack: string | undefined;
        retryable: boolean;
        details: Record<string, unknown> | undefined;
    };
}
export declare function toError(err: unknown): Error;
