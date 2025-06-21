import {
    defineSignal,
    proxyActivities,
    setHandler,
    condition,
} from '@temporalio/workflow';
import {CommandResult}  from "../../contracts";
import type { Command, UUID } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';
import type * as ObservabilityActivities from '../activities/observabilityActivities';

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
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID
): Promise<CommandResult> {
    const commandQueue: Command[] = [];
    const processedIds = new Set<string>();

    setHandler(commandSignal, (cmd) => {
        commandQueue.push(cmd);
    });

    //todo consider separate workflow to sink
    setHandler(obsTraceSignal, async ({ span, data }) => {
        await emitObservabilitySpan(span, data);
    });

    while (true) {
        while (commandQueue.length > 0) {
            const cmd = commandQueue.shift();
            if (!cmd || processedIds.has(cmd.id)) continue;
            processedIds.add(cmd.id);

            const { events = [], status, error } = await getEventsForCommand(cmd);
            if (status === 'fail') return { status, error };

            await applyEvents(cmd.tenant_id, cmd.payload.aggregateType, cmd.payload.aggregateId, events);
            await projectEvents(events);

            for (const evt of events) {
                await routeEvent(evt);
            }
        }

        const alive = await condition(() => commandQueue.length > 0, WORKFLOW_TTL_IN_MS);
        if (!alive) break;
    }

    return { status: 'success' };
}
