import { StringValue } from 'ms';
import type { google } from '@temporalio/proto';
export type Timestamp = google.protobuf.ITimestamp;
/**
 * A duration, expressed either as a number of milliseconds, or as a {@link https://www.npmjs.com/package/ms | ms-formatted string}.
 */
export type Duration = StringValue | number;
export type { StringValue } from 'ms';
/**
 * Lossy conversion function from Timestamp to number due to possible overflow.
 * If ts is null or undefined returns undefined.
 */
export declare function optionalTsToMs(ts: Timestamp | null | undefined): number | undefined;
/**
 * Lossy conversion function from Timestamp to number due to possible overflow.
 * If ts is null or undefined, throws a TypeError, with error message including the name of the field.
 */
export declare function requiredTsToMs(ts: Timestamp | null | undefined, fieldName: string): number;
/**
 * Lossy conversion function from Timestamp to number due to possible overflow
 */
export declare function tsToMs(ts: Timestamp | null | undefined): number;
export declare function msNumberToTs(millis: number): Timestamp;
export declare function msToTs(str: Duration): Timestamp;
export declare function msOptionalToTs(str: Duration | undefined | null): Timestamp | undefined;
export declare function msOptionalToNumber(val: Duration | undefined): number | undefined;
export declare function msToNumber(val: Duration): number;
export declare function tsToDate(ts: Timestamp): Date;
export declare function requiredTsToDate(ts: Timestamp | null | undefined, fieldName: string): Date;
export declare function optionalTsToDate(ts: Timestamp | null | undefined): Date | undefined;
export declare function optionalDateToTs(date: Date | null | undefined): Timestamp | undefined;
