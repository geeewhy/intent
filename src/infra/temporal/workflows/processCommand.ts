// processCommand.ts
import {
    defineSignal,
    proxyActivities,
    setHandler,
    workflowInfo as wfInfo,
    condition
} from '@temporalio/workflow';
import type { Command, Event, UUID } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';

// Define the result type for the workflow
type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: string;
};

// Signal for receiving new commands for the aggregate
const commandSignal = defineSignal<[Command]>('command');

// Activities for interacting with the core domain
const { executeCommand, loadAggregate, applyEvent } = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

// TTL in milliseconds for the workflow to stay alive after last activity
const WORKFLOW_TTL = 500; // 500 ms

/**
 * Process commands for a specific aggregate
 * The workflowId should be in the format: {tenantId}_{aggregateType}-{aggregateId}
 * This ensures only one workflow is active for a given aggregate at a time
 */
export async function processCommand(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    initialCommand: Command
): Promise<CommandResult> {
    console.log(`[processCommand] Starting workflow for ${aggregateType}:${aggregateId}`);

    // Track the last activity time for TTL
    let lastActivityTime = Date.now();

    // Load the aggregate state
    const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
    console.log(`[processCommand] Loaded aggregate state: ${aggregate ? 'exists' : 'new'}`, aggregate);
    let commandExecuted = false;
    let result: CommandResult = { status: 'success', events: [] };

    // Set up signal handler for new commands
    setHandler(commandSignal, async (cmd) => {
        console.log(`[processCommand] Received command signal: ${cmd.type}`);
        lastActivityTime = Date.now();

        // Execute the command on the aggregate
        const response = await executeCommand(tenantId, aggregateType, aggregateId, cmd);

        // Check if this is a business rule violation
        if (response.status === 'fail') {
            console.log(`[processCommand] Business rule violation: ${response.error}`);
            // We don't fail the workflow for business rule violations
            commandExecuted = true;
            return;
        }

        const events = response.events || [];

        if (events.length > 0) {
            console.log(`[processCommand] First event produced from signal:`, events[0].type);
            // Events are already applied in executeCommand, no need to call applyEvent again
        }

        console.log(`[processCommand] Command executed, produced ${events.length} events`);

        // Update last activity time after command execution
        lastActivityTime = Date.now();
        commandExecuted = true;
    });

    // Process the initial command
    console.log(`[processCommand] Processing initial command: ${initialCommand.type}`);
    lastActivityTime = Date.now();
    const response = await executeCommand(tenantId, aggregateType, aggregateId, initialCommand);

    // Check if this is a business rule violation
    if (response.status === 'fail') {
        console.log(`[processCommand] Business rule violation: ${response.error}`);
        // We don't fail the workflow for business rule violations
        result = { status: 'fail', error: response.error };
        commandExecuted = true;
    } else {
        const events = response.events || [];

        if (events.length > 0) {
            console.log(`[processCommand] First event produced:`, events[0].type);
            // Events are already applied in executeCommand, no need to call applyEvent again
        }

        console.log(`[processCommand] Initial command executed, produced ${events.length} events`);
        result = { status: 'success', events };
        commandExecuted = true;
    }

    // Keep workflow alive until TTL expires
    await condition(() => commandExecuted || Date.now() - lastActivityTime > WORKFLOW_TTL);
    console.log(`[processSaga] Workflow TTL expired after ${WORKFLOW_TTL}ms of inactivity`);

    return result;
}
