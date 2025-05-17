/**
 * Debug replayer workflow inbound interceptors.
 * Notify the runner when workflow starts or a signal is received, required for setting breakpoints on workflow tasks.
 *
 * @module
 */
import { WorkflowInterceptorsFactory } from '@temporalio/workflow';
export declare const interceptors: WorkflowInterceptorsFactory;
