/**
 * Debug replayer workflow outbound interceptors.
 * Notify the runner when outbound operations resolve, required for setting breakpoints on workflow tasks.
 *
 * @module
 */
import { WorkflowInterceptorsFactory } from '@temporalio/workflow';
export declare const interceptors: WorkflowInterceptorsFactory;
