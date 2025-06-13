import { Scheduler } from '../temporal/scheduler';
import { WorkflowExecutionInfo } from '@temporalio/client';
import { Event } from '../../core/contracts';
import { PgEventStore } from '../pg/pg-event-store';
/**
 * Helper function to wait for a specific time
 * @param ms The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export declare const wait: (ms: number) => Promise<unknown>;
export declare const waitForNewEvents: (eventStore: PgEventStore, tenantId: string, aggregateType: string, aggregateId: string, fromVersion: number, expectedCount: number, timeoutMs?: number, intervalMs?: number) => Promise<Event[]>;
/**
 * Wait for a snapshot to be created for an aggregate
 * @param eventStore
 * @param tenantId
 * @param aggregateType
 * @param aggregateId
 * @param minVersion
 * @param timeoutMs
 * @param intervalMs
 */
export declare const waitForSnapshot: (eventStore: PgEventStore, tenantId: string, aggregateType: string, aggregateId: string, minVersion?: number, timeoutMs?: number, intervalMs?: number) => Promise<{
    version: number;
    state: any;
    schemaVersion: number;
}>;
/**
 * Generates the workflow ID for a processSaga workflow
 * @param tenantId The tenant ID
 * @param orderId The order ID
 * @returns The workflow ID for the processSaga workflow
 */
export declare const getSagaWorkflowId: (tenantId: string, orderId: string) => string;
/**
 * Generates the workflow ID for a processEvent workflow
 * @param tenantId The tenant ID
 * @param aggregateType The aggregate type
 * @param aggregateId The aggregate ID
 * @returns The workflow ID for the processEvent workflow
 */
export declare const getAggregateWorkflowId: (tenantId: string, aggregateType: string, aggregateId: string) => string;
/**
 * Checks for running workflows with the specified workflow IDs
 * @param scheduler The temporal scheduler
 * @param workflowIds The workflow IDs to check for
 * @returns An array of running workflows
 */
export declare const getWorkflowsById: (scheduler: Scheduler, workflowIds: string[]) => Promise<WorkflowExecutionInfo[]>;
/**
 * Find all running workflows with tenant prefix, optionally terminate them.
 */
export declare const verifyNoLeakedWorkflows: (scheduler: Scheduler, tenantId: string, terminate?: boolean, workflowIdsToCheck?: never[]) => Promise<void>;
export declare const getWorkflowDetails: (scheduler: Scheduler, workflowId: string) => Promise<WorkflowExecutionInfo | undefined>;
/**
 * Verifies that the expected workflows are running
 * @param runningWorkflows The array of running workflows
 * @param expectedWorkflowIds The expected workflow IDs
 * @param expectedCount The expected number of workflows
 */
export declare const verifyWorkflowsById: (runningWorkflows: WorkflowExecutionInfo[], expectedWorkflowIds: string[], expectedCount: number) => void;
