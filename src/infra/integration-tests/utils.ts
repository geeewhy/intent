//src/infra/integration-tests/utils.ts
import {Scheduler} from '../temporal/scheduler';
import {WorkflowExecutionInfo} from '@temporalio/client';
import {Event} from '../../core/contracts';
import {PgEventStore} from '../pg/pg-event-store';
import {log} from '../../core/logger';

/**
 * Helper function to wait for a specific time
 * @param ms The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitForNewEvents = async (
    eventStore: PgEventStore,
    tenantId: string,
    aggregateType: string,
    aggregateId: string,
    fromVersion: number,
    expectedCount: number,
    timeoutMs = 10000,
    intervalMs = 50,
): Promise<Event[]> => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const result = await eventStore.load(tenantId, aggregateType, aggregateId, fromVersion);

        // Defensive null check — aggregate may not yet exist
        if (result && result?.events.length >= expectedCount) {
            return result.events;
        }

        await wait(intervalMs);
    }

    throw new Error(
        `Timed out waiting for ${expectedCount} event(s) from version ${fromVersion} for aggregate ${aggregateType}-${aggregateId}`
    );
};


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
export const waitForSnapshot = async (
    eventStore: PgEventStore,
    tenantId: string,
    aggregateType: string,
    aggregateId: string,
    minVersion = 1,
    timeoutMs = 5000,
    intervalMs = 50,
): Promise<{ version: number; state: any; schemaVersion: number }> => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);

        if (snapshot) {
            log()?.info('Snapshot found', {
                operation: 'waitForSnapshot',
                aggregateType,
                aggregateId,
                version: snapshot.version
            });
            return snapshot;
        }

        await wait(intervalMs);
    }

    throw new Error(
        `Timed out waiting for snapshot of aggregate ${aggregateType}-${aggregateId} to reach version ${minVersion}`
    );
};

/**
 * Generates the workflow ID for a processSaga workflow
 * @param tenantId The tenant ID
 * @param orderId The order ID
 * @returns The workflow ID for the processSaga workflow
 */
export const getSagaWorkflowId = (tenantId: string, orderId: string): string => {
    return `${tenantId}_${orderId}`;
};

/**
 * Generates the workflow ID for a processEvent workflow
 * @param tenantId The tenant ID
 * @param aggregateType The aggregate type
 * @param aggregateId The aggregate ID
 * @returns The workflow ID for the processEvent workflow
 */
export const getAggregateWorkflowId = (tenantId: string, aggregateType: string, aggregateId: string): string => {
    return `${tenantId}_${aggregateType}-${aggregateId}`;
};

/**
 * Checks for running workflows with the specified workflow IDs
 * @param scheduler The temporal scheduler
 * @param workflowIds The workflow IDs to check for
 * @returns An array of running workflows
 */
export const getWorkflowsById = async (
    scheduler: Scheduler,
    workflowIds: string[]
): Promise<WorkflowExecutionInfo[]> => {
    const workflowClient = await scheduler.getClient();
    const workflows: WorkflowExecutionInfo[] = [];

    for (const workflowId of workflowIds) {
        log()?.debug('Checking for workflow', {
            operation: 'getWorkflowsById',
            workflowId
        });
        const executions = workflowClient.list({query: `WorkflowId = "${workflowId}"`});

        for await (const wf of executions) {
            workflows.push(wf);
        }
    }

    return workflows;
};

/**
 * Find all running workflows with tenant prefix, optionally terminate them.
 */
export const verifyNoLeakedWorkflows = async (
    scheduler: Scheduler,
    tenantId: string,
    terminate = false,
    workflowIdsToCheck = [],
): Promise<void> => {
    const client = await scheduler.getClient();
    const running = client.list({query: 'ExecutionStatus="Running"'});

    const leaks: WorkflowExecutionInfo[] = [];

    for await (const wf of running) {
        if (wf.workflowId?.startsWith(`${tenantId}_`)) {
            leaks.push(wf);
        }
    }

    if (leaks.length > 0) {
        const logger = log()?.child({
            operation: 'verifyNoLeakedWorkflows',
            tenantId,
            leakCount: leaks.length
        });

        logger?.error('Found running workflows', {
            workflowIds: leaks.map(wf => wf.workflowId)
        });

        // Terminate the workflow if requested
        if (terminate) {
            for (const wf of leaks) {
                try {
                    logger?.info('Terminating workflow', { workflowId: wf.workflowId });
                    const handle = client.getHandle(wf.workflowId);
                    await handle.terminate('Terminated by test cleanup');
                    logger?.info('Successfully terminated workflow', { workflowId: wf.workflowId });
                } catch (error) {
                    logger?.error('Error terminating workflow', { 
                        workflowId: wf.workflowId,
                        error
                    });
                }
            }
        }

        if (!terminate) {
            throw new Error(`${leaks.length} workflows leaked after tests`);
        }
    } else {
        log()?.info('No workflow leaks detected', {
            operation: 'verifyNoLeakedWorkflows',
            tenantId
        });
    }
};

export const getWorkflowDetails = async (
    scheduler: Scheduler,
    workflowId: string
): Promise<WorkflowExecutionInfo | undefined> => {
    const workflowClient = await scheduler.getClient();

    const executions = workflowClient.list({query: `WorkflowId = "${workflowId}"`});

    for await (const wf of executions) {
        return wf; // There should only be one for a given ID
    }

    return undefined;
};

/**
 * Verifies that the expected workflows are running
 * @param runningWorkflows The array of running workflows
 * @param expectedWorkflowIds The expected workflow IDs
 * @param expectedCount The expected number of workflows
 */
export const verifyWorkflowsById = (
    runningWorkflows: WorkflowExecutionInfo[],
    expectedWorkflowIds: string[],
    expectedCount: number
): void => {
    // Verify that the expected number of workflows are running
    expect(runningWorkflows.length).toBe(expectedCount);

    // Check if we have all the expected workflow IDs
    const workflowIds = runningWorkflows.map(wf => wf.workflowId);
    for (const expectedId of expectedWorkflowIds) {
        expect(workflowIds).toContain(expectedId);
    }
};
