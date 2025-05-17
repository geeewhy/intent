/**
 * Entry point for classes and utilities related to using
 * {@link https://docs.temporal.io/typescript/data-converters#protobufs | Protobufs} for serialization.
 *
 * Import from `@temporalio/common/lib/protobufs`, for example:
 *
 * ```
 * import { patchProtobufRoot } from '@temporalio/common/lib/protobufs';
 * ```
 * @module
 */
export * from './converter/protobuf-payload-converters';
export { patchProtobufRoot } from '@temporalio/proto/lib/patch-protobuf-root';
