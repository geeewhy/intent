"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRuleViolation = void 0;
exports.toError = toError;
class BusinessRuleViolation extends Error {
    constructor(message, details, retryable = false) {
        super(message);
        this.message = message;
        this.name = 'BusinessRuleViolation'; // must be set AFTER super
        this.message = message;
        // Must set these explicitly on `this`
        this.details = details;
        this.retryable = retryable;
        // Fix prototype chain — **CRUCIAL**
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
exports.BusinessRuleViolation = BusinessRuleViolation;
function toError(err) {
    return err instanceof Error
        ? err
        : Object.assign(new Error('Non-error thrown'), { cause: err });
}
//# sourceMappingURL=errors.js.map