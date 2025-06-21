export class BusinessRuleViolation extends Error {
    public readonly retryable: boolean;
    public readonly details?: Record<string, unknown>;

    constructor(public readonly message: string, details?: Record<string, unknown>, retryable = false) {
        super(message);
        this.name = 'BusinessRuleViolation'; // must be set AFTER super

        // Must set these explicitly on `this`
        this.details = details;
        this.retryable = retryable;

        // Fix prototype chain  --  **CRUCIAL**
        Object.setPrototypeOf(this, new.target.prototype);

        // Optional: capture proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    //magic fn for auto serializers
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            retryable: this.retryable,
            details: this.details,
        };
    }
}

export function toError(err: unknown): Error {
    return err instanceof Error
        ? err
        : Object.assign(new Error('Non-error thrown'), { cause: err });
}

