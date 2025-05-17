import { ServiceError as GrpcServiceError } from '@grpc/grpc-js';
import { LoadedDataConverter } from '@temporalio/common';
import { Replace } from '@temporalio/common/lib/type-helpers';
import { temporal } from '@temporalio/proto';
import { CountWorkflowExecution, RawWorkflowExecutionInfo, WorkflowExecutionInfo } from './types';
export declare function executionInfoFromRaw<T>(raw: RawWorkflowExecutionInfo, dataConverter: LoadedDataConverter, rawDataToEmbed: T): Promise<Replace<WorkflowExecutionInfo, {
    raw: T;
}>>;
export declare function decodeCountWorkflowExecutionsResponse(raw: temporal.api.workflowservice.v1.ICountWorkflowExecutionsResponse): CountWorkflowExecution;
/**
 * If the error type can be determined based on embedded grpc error details,
 * then rethrow the appropriate TypeScript error. Otherwise do nothing.
 *
 * This function should be used before falling back to generic error handling
 * based on grpc error code. Very few error types are currently supported, but
 * this function will be expanded over time as more server error types are added.
 */
export declare function rethrowKnownErrorTypes(err: GrpcServiceError): void;
