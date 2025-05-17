import { type Timestamp, Duration } from './time';
/**
 * Lossy conversion function from Timestamp to number due to possible overflow.
 * If ts is null or undefined returns undefined.
 *
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function optionalTsToMs(ts: Timestamp | null | undefined): number | undefined;
/**
 * Lossy conversion function from Timestamp to number due to possible overflow
 *
 * @hidden
 * @deprecated - meant for internal use only
 * @deprecated - meant for internal use only
 */
export declare function tsToMs(ts: Timestamp | null | undefined): number;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function msNumberToTs(millis: number): Timestamp;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function msToTs(str: Duration): Timestamp;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function msOptionalToTs(str: Duration | undefined): Timestamp | undefined;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function msOptionalToNumber(val: Duration | undefined): number | undefined;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function msToNumber(val: Duration): number;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function tsToDate(ts: Timestamp): Date;
/**
 * @hidden
 * @deprecated - meant for internal use only
 */
export declare function optionalTsToDate(ts: Timestamp | null | undefined): Date | undefined;
