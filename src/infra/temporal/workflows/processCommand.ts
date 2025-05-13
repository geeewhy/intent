import {
    defineSignal,
    proxyActivities,
    setHandler,
    condition,
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

const {
    getEventsForCommand,
    snapshotAggregate,
    routeEvent,
    applyEvents,
    projectEventsActivity
} = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

const WORKFLOW_TTL_IN_MS = 1000;

export async function processCommand(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<CommandResult> {
    const commandQueue: Command[] = [];
    let lastCommandId: string | null = null;
    let appliesSinceLastSnapshot = 0;

    setHandler(commandSignal, (cmd) => {
        commandQueue.push(cmd);
    });

    while (true) {
        while (commandQueue.length > 0) {
            const cmd = commandQueue.shift();
            if (!cmd || cmd.id === lastCommandId) continue;
            lastCommandId = cmd.id;

            const { events = [], status, error } = await getEventsForCommand(cmd);
            if (status === 'fail') return { status, error };

            await applyEvents(cmd.tenant_id, cmd.payload.aggregateType, cmd.payload.aggregateId, events);
            await projectEventsActivity(events);
            appliesSinceLastSnapshot += events.length;

            for (const evt of events) {
                await routeEvent(evt);
            }

            if (appliesSinceLastSnapshot >= 2) {
                await snapshotAggregate(
                    cmd.tenant_id,
                    cmd.payload.aggregateType,
                    cmd.payload.aggregateId
                );
                appliesSinceLastSnapshot = 0;
            }
        }

        const alive = await condition(() => commandQueue.length > 0, WORKFLOW_TTL_IN_MS);
        if (!alive) break;
    }

    return { status: 'success' };
}
