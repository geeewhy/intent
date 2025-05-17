import type { temporal } from '@temporalio/proto';
import { Duration } from './time';
/**
 * Options for retrying Workflows and Activities
 */
export interface RetryPolicy {
    /**
     * Coefficient used to calculate the next retry interval.
     * The next retry interval is previous interval multiplied by this coefficient.
     * @minimum 1
     * @default 2
     */
    backoffCoefficient?: number;
    /**
     * Interval of the first retry.
     * If coefficient is 1 then it is used for all retries
     * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
     * @default 1 second
     */
    initialInterval?: Duration;
    /**
     * Maximum number of attempts. When exceeded, retries stop (even if {@link ActivityOptions.scheduleToCloseTimeout}
     * hasn't been reached).
     *
     * @default Infinity
     */
    maximumAttempts?: number;
    /**
     * Maximum interval between retries.
     * Exponential backoff leads to interval increase.
     * This value is the cap of the increase.
     *
     * @default 100x of {@link initialInterval}
     * @format number of milliseconds or {@link https://www.npmjs.com/package/ms | ms-formatted string}
     */
    maximumInterval?: Duration;
    /**
     * List of application failures types to not retry.
     */
    nonRetryableErrorTypes?: string[];
}
/**
 * Turn a TS RetryPolicy into a proto compatible RetryPolicy
 */
export declare function compileRetryPolicy(retryPolicy: RetryPolicy): temporal.api.common.v1.IRetryPolicy;
/**
 * Turn a proto compatible RetryPolicy into a TS RetryPolicy
 */
export declare function decompileRetryPolicy(retryPolicy?: temporal.api.common.v1.IRetryPolicy | null): RetryPolicy | undefined;
