// processCommand.ts
import {
    defineSignal,
    proxyActivities,
    setHandler,
    condition,
    allHandlersFinished,
    sleep
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
const WORKFLOW_TTL_IN_MS = 1000;
const WORKFLOW_TTL_INTERVAL_IN_MS = 500;

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
    let result: CommandResult = { status: 'success', events: [] };
    const commandQueue: Command[] = [];

    setHandler(commandSignal, (cmd) => {
        console.log(`[processCommand] Received command signal: ${cmd.type}`);
        commandQueue.push(cmd);
        lastActivityTime = Date.now();
    });

    while (true) {
        if (commandQueue.length > 0) {
            const cmd = commandQueue.shift();
            if (!cmd) continue;
            console.log(`[processCommand] Processing queued command: ${cmd.type}`);

            const response = await executeCommand(tenantId, aggregateType, aggregateId, cmd);

            if (response.status === 'fail') {
                console.log(`[processCommand] Business rule violation: ${response.error}`);
            } else {
                const events = response.events || [];
                if (events.length > 0) {
                    console.log(`[processCommand] Events from command:`, events.map(e => e.type));
                }
            }

            lastActivityTime = Date.now();
        } else {
            // TTL check
            await sleep(WORKFLOW_TTL_INTERVAL_IN_MS);
            if (Date.now() - lastActivityTime > WORKFLOW_TTL_IN_MS) {
                console.log(`[processCommand] ${WORKFLOW_TTL_IN_MS} TTL expired. Exiting.`);
                break;
            }
        }
    }

    await condition(allHandlersFinished);

    return result;
}
