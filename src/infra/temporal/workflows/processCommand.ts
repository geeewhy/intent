import {
    defineSignal,
    proxyActivities,
    setHandler,
    condition,
} from '@temporalio/workflow';
import type {Command, Event, UUID} from '../../../core/contracts';
import type {DomainActivities} from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';
import type * as ObservabilityActivities from '../activities/observabilityActivities';

type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: Error;
};

const commandSignal = defineSignal<[Command]>('command');
const obsTraceSignal = defineSignal<[{ span: string; data?: Record<string, any> }]>('obs.trace');

const {
    getEventsForCommand,
    routeEvent,
    applyEvents,
    projectEvents,
    emitObservabilitySpan,
} = proxyActivities<DomainActivities &
    typeof coreActivities &
    typeof ObservabilityActivities>({
    startToCloseTimeout: '1 minute',
});

const WORKFLOW_TTL_IN_MS = 1000;

export async function processCommand(
    //todo check if temporal works with fn footprint, even not utilized
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<CommandResult> {
    const commandQueue: Command[] = [];
    let lastCommandId: string | null = null;

    setHandler(commandSignal, (cmd) => {
        commandQueue.push(cmd);
    });

    //todo doesnt belong here, start a separate flow
    setHandler(obsTraceSignal, async ({span, data}) => {
        await emitObservabilitySpan(span, data);
    });

    while (true) {
        while (commandQueue.length > 0) {
            const cmd = commandQueue.shift();
            if (!cmd || cmd.id === lastCommandId) continue;
            lastCommandId = cmd.id;

            const {events = [], status, error} = await getEventsForCommand(cmd);
            if (status === 'fail') return {status, error};

            await applyEvents(cmd.tenant_id, cmd.payload.aggregateType, cmd.payload.aggregateId, events);
            await projectEvents(events);

            for (const evt of events) {
                await routeEvent(evt);
            }
        }

        const alive = await condition(() => commandQueue.length > 0, WORKFLOW_TTL_IN_MS);
        if (!alive) break;
    }

    return {status: 'success'};
}
