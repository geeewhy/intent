import { coresdk } from '@temporalio/proto';
/**
 * Base class for all workflow errors
 */
export declare class WorkflowError extends Error {
}
/**
 * Thrown in workflow when it tries to do something that non-deterministic such as construct a WeakRef()
 */
export declare class DeterminismViolationError extends WorkflowError {
}
/**
 * A class that acts as a marker for this special result type
 */
export declare class LocalActivityDoBackoff extends Error {
    readonly backoff: coresdk.activity_result.IDoBackoff;
    constructor(backoff: coresdk.activity_result.IDoBackoff);
}
/**
 * Returns whether provided `err` is caused by cancellation
 */
export declare function isCancellation(err: unknown): boolean;
