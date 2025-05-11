//src/infra/integration-tests/utils.ts
import {TemporalScheduler} from '../temporal/temporal-scheduler';
import {WorkflowExecutionInfo} from '@temporalio/client';
import {expect} from '@jest/globals';
import {Event} from '../../core/contracts';
import {SupabaseClient} from '@supabase/supabase-js';
import {PgEventStore} from '../pg/pg-event-store';

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
            console.log(`[waitForSnapshot] Snapshot found for ${aggregateType}-${aggregateId} at version ${snapshot.version}`);
            return snapshot;
        }

        await wait(intervalMs);
    }

    throw new Error(
        `Timed out waiting for snapshot of aggregate ${aggregateType}-${aggregateId} to reach version ${minVersion}`
    );
};

/**
 * @OBSOLETE: Helper function to check if events were created
 * Helper function to check if events were created
 * @param supabase The Supabase client
 * @param aggregateId The aggregate ID to check for events
 * @param expectedCount The expected number of events
 * @param TTL The maximum number of attempts to check for events
 * @returns An array of events
 */
export const checkForEvents = async (
    supabase: SupabaseClient,
    aggregateId: string,
    expectedCount: number,
    TTL = 500
): Promise<Event[]> => {
    let currentProgress = 0;
    let events: Event[] = [];
    let hitExpected = false;
    while (currentProgress < TTL && !hitExpected) {
        const {data, error} = await supabase
            .from('events')
            .select('*')
            .eq('aggregate_id', aggregateId)
            .order('created_at', {ascending: false});

        console.log('Got events:', data);

        if (error) {
            console.error('Error fetching events:', error);
        } else if (data && data.length >= expectedCount) {
            console.log("Hit expected count of events");
            hitExpected = true;
            events = data;
            console.log("Got events:", events);
            break;
        }

        let ttlIncrement = TTL / 10;
        await wait(ttlIncrement);
        console.log('Waiting for events...');
        currentProgress += ttlIncrement;
    }

    return events;
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
    scheduler: TemporalScheduler,
    workflowIds: string[]
): Promise<WorkflowExecutionInfo[]> => {
    const workflowClient = await scheduler.getClient();
    const workflows: WorkflowExecutionInfo[] = [];

    for (const workflowId of workflowIds) {
        console.log(`Checking for workflow with ID: ${workflowId}`);
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
    scheduler: TemporalScheduler,
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
        console.error(`[verifyNoLeakedWorkflows] Found ${leaks.length} running workflow(s) for tenant ${tenantId}`);
        for (const wf of leaks) {
            console.error(`→ ${wf.workflowId}`);

            // Terminate the workflow if requested
            if (terminate) {
                try {
                    console.log(`[verifyNoLeakedWorkflows] Terminating workflow: ${wf.workflowId}`);
                    const handle = client.getHandle(wf.workflowId);
                    await handle.terminate('Terminated by test cleanup');
                    console.log(`[verifyNoLeakedWorkflows] Successfully terminated workflow: ${wf.workflowId}`);
                } catch (error) {
                    console.error(`[verifyNoLeakedWorkflows] Error terminating workflow ${wf.workflowId}:`, error);
                }
            }
        }

        if (!terminate) {
            throw new Error(`[verifyNoLeakedWorkflows] ${leaks.length} workflows leaked after tests`);
        }
    } else {
        console.log(`[verifyNoLeakedWorkflows] ✅ No workflow leaks for tenant ${tenantId}`);
    }
};

export const getWorkflowDetails = async (
    scheduler: TemporalScheduler,
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
