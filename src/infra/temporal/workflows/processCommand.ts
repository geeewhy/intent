import {
    defineSignal,
    proxyActivities,
    setHandler,
    condition, allHandlersFinished,
} from '@temporalio/workflow';
import type { Command, Event, UUID } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';

type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: string;
};

const commandSignal = defineSignal<[Command]>('command');

const { executeCommand, loadAggregate, snapshotAggregate } = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

const WORKFLOW_TTL_IN_MS = 30;

let appliesSinceLastSnapshot = 0;

export async function processCommand(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<CommandResult> {
    console.log(`[processCommand] Starting workflow for ${aggregateType}:${aggregateId}`);

    const commandQueue: Command[] = [];
    let lastCommandId: string | null = null;
    let result: CommandResult = { status: 'success', events: [] };

    setHandler(commandSignal, (cmd) => {
        console.log(`[processCommand] Received command signal: ${cmd.type}`);
        commandQueue.push(cmd);
    });

    const aggregate = await loadAggregate(tenantId, aggregateType, aggregateId);
    console.log(`[processCommand] Loaded aggregate state: ${aggregate ? 'exists' : 'new'}`, aggregate);

    while (true) {
        // Drain queue
        while (commandQueue.length > 0) {
            const cmd = commandQueue[0];
            if (!cmd) {
                commandQueue.shift();
                continue;
            }

            if (cmd.id === lastCommandId) {
                console.log(`[processCommand] Duplicate command ID ${cmd.id}, ignoring.`);
                commandQueue.shift();
                continue;
            }

            console.log(`[processCommand] Processing queued command: ${cmd.type}`);
            lastCommandId = cmd.id;

            const response = await executeCommand(tenantId, aggregateType, aggregateId, cmd);
            if (response.status === 'fail') {
                console.log(`[processCommand] Business rule violation: ${response.error}`);
            } else {
                const events = response.events || [];
                if (events.length > 0) {
                    console.log(`[processCommand] Events from command:`, events.map(e => e.type));
                    appliesSinceLastSnapshot++;
                    if (appliesSinceLastSnapshot >= 2) {
                        await snapshotAggregate(tenantId, aggregateType, aggregateId);
                        appliesSinceLastSnapshot = 0;
                        console.log(`[processCommand] Snapshot taken after ${events.length} events`);
                    }
                }
            }

            commandQueue.shift();
        }

        const stillAlive = await condition(() => {
            return commandQueue.length > 0;
        }, WORKFLOW_TTL_IN_MS);

        if (!stillAlive) {
            console.log(`[processCommand] ${WORKFLOW_TTL_IN_MS} TTL expired. Exiting.`);
            break;
        }
    }

    return result;
}
