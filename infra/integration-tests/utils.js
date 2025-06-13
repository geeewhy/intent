"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWorkflowsById = exports.getWorkflowDetails = exports.verifyNoLeakedWorkflows = exports.getWorkflowsById = exports.getAggregateWorkflowId = exports.getSagaWorkflowId = exports.waitForSnapshot = exports.waitForNewEvents = exports.wait = void 0;
const logger_1 = require("../../core/logger");
/**
 * Helper function to wait for a specific time
 * @param ms The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.wait = wait;
const waitForNewEvents = async (eventStore, tenantId, aggregateType, aggregateId, fromVersion, expectedCount, timeoutMs = 10000, intervalMs = 50) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const result = await eventStore.load(tenantId, aggregateType, aggregateId, fromVersion);
        // Defensive null check — aggregate may not yet exist
        if (result && result?.events.length >= expectedCount) {
            return result.events;
        }
        await (0, exports.wait)(intervalMs);
    }
    throw new Error(`Timed out waiting for ${expectedCount} event(s) from version ${fromVersion} for aggregate ${aggregateType}-${aggregateId}`);
};
exports.waitForNewEvents = waitForNewEvents;
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
const waitForSnapshot = async (eventStore, tenantId, aggregateType, aggregateId, minVersion = 1, timeoutMs = 5000, intervalMs = 50) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const snapshot = await eventStore.loadSnapshot(tenantId, aggregateType, aggregateId);
        if (snapshot) {
            (0, logger_1.log)()?.info('Snapshot found', {
                operation: 'waitForSnapshot',
                aggregateType,
                aggregateId,
                version: snapshot.version
            });
            return snapshot;
        }
        await (0, exports.wait)(intervalMs);
    }
    throw new Error(`Timed out waiting for snapshot of aggregate ${aggregateType}-${aggregateId} to reach version ${minVersion}`);
};
exports.waitForSnapshot = waitForSnapshot;
/**
 * Generates the workflow ID for a processSaga workflow
 * @param tenantId The tenant ID
 * @param orderId The order ID
 * @returns The workflow ID for the processSaga workflow
 */
const getSagaWorkflowId = (tenantId, orderId) => {
    return `${tenantId}_${orderId}`;
};
exports.getSagaWorkflowId = getSagaWorkflowId;
/**
 * Generates the workflow ID for a processEvent workflow
 * @param tenantId The tenant ID
 * @param aggregateType The aggregate type
 * @param aggregateId The aggregate ID
 * @returns The workflow ID for the processEvent workflow
 */
const getAggregateWorkflowId = (tenantId, aggregateType, aggregateId) => {
    return `${tenantId}_${aggregateType}-${aggregateId}`;
};
exports.getAggregateWorkflowId = getAggregateWorkflowId;
/**
 * Checks for running workflows with the specified workflow IDs
 * @param scheduler The temporal scheduler
 * @param workflowIds The workflow IDs to check for
 * @returns An array of running workflows
 */
const getWorkflowsById = async (scheduler, workflowIds) => {
    const workflowClient = await scheduler.getClient();
    const workflows = [];
    for (const workflowId of workflowIds) {
        (0, logger_1.log)()?.debug('Checking for workflow', {
            operation: 'getWorkflowsById',
            workflowId
        });
        const executions = workflowClient.list({ query: `WorkflowId = "${workflowId}"` });
        for await (const wf of executions) {
            workflows.push(wf);
        }
    }
    return workflows;
};
exports.getWorkflowsById = getWorkflowsById;
/**
 * Find all running workflows with tenant prefix, optionally terminate them.
 */
const verifyNoLeakedWorkflows = async (scheduler, tenantId, terminate = false, workflowIdsToCheck = []) => {
    const client = await scheduler.getClient();
    const running = client.list({ query: 'ExecutionStatus="Running"' });
    const leaks = [];
    for await (const wf of running) {
        if (wf.workflowId?.startsWith(`${tenantId}_`)) {
            leaks.push(wf);
        }
    }
    if (leaks.length > 0) {
        const logger = (0, logger_1.log)()?.child({
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
                }
                catch (error) {
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
    }
    else {
        (0, logger_1.log)()?.info('No workflow leaks detected', {
            operation: 'verifyNoLeakedWorkflows',
            tenantId
        });
    }
};
exports.verifyNoLeakedWorkflows = verifyNoLeakedWorkflows;
const getWorkflowDetails = async (scheduler, workflowId) => {
    const workflowClient = await scheduler.getClient();
    const executions = workflowClient.list({ query: `WorkflowId = "${workflowId}"` });
    for await (const wf of executions) {
        return wf; // There should only be one for a given ID
    }
    return undefined;
};
exports.getWorkflowDetails = getWorkflowDetails;
/**
 * Verifies that the expected workflows are running
 * @param runningWorkflows The array of running workflows
 * @param expectedWorkflowIds The expected workflow IDs
 * @param expectedCount The expected number of workflows
 */
const verifyWorkflowsById = (runningWorkflows, expectedWorkflowIds, expectedCount) => {
    // Verify that the expected number of workflows are running
    expect(runningWorkflows.length).toBe(expectedCount);
    // Check if we have all the expected workflow IDs
    const workflowIds = runningWorkflows.map(wf => wf.workflowId);
    for (const expectedId of expectedWorkflowIds) {
        expect(workflowIds).toContain(expectedId);
    }
};
exports.verifyWorkflowsById = verifyWorkflowsById;
//# sourceMappingURL=utils.js.map