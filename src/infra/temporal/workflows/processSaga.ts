// processSaga.ts
import {
    defineSignal,
    proxyActivities,
    setHandler,
    sleep,
    workflowInfo as wfInfo,
    condition
} from '@temporalio/workflow';
import type { Command } from '../../../core/contracts';
import { SagaRegistry } from '../../../core/domains';
import type { SagaDefinition } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';

const externalCommandSignal = defineSignal<[Command]>('externalCommand');

const { dispatchCommand, generateUUID } = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

/**
 * Main saga processor workflow
 */
export async function processSaga(initialCommand: Command): Promise<void> {
    const sagaDef = findSaga(initialCommand);
    if (!sagaDef) {
        console.warn(`[processSaga] No matching saga for: ${initialCommand.type}`);
        return;
    }

    let planExecuted = false;
    setHandler(externalCommandSignal, async (cmd) => {
        console.log("SIGNAL RUN", wfInfo());
        const plan = await sagaDef.plan(cmd, { nextId: generateUUID });
        console.log(`[processSaga] Got signal-triggered plan`, plan);
        await executePlan(plan);
        planExecuted = true;
    });

    await condition(() => planExecuted);
}

/**
 * Helper: Locate matching saga for a given input
 */
function findSaga(input: Command): SagaDefinition | undefined {
    return Object.values(SagaRegistry).find((saga) => saga.idFor(input));
}

/**
 * Execute a saga plan
 */
async function executePlan(plan: { commands: Command[]; delays?: { cmd: Command; ms: number }[] }) {
    console.log(`[processSaga] Executing plan with ${plan.commands.length} commands and ${plan.delays?.length || 0} delays`);

    for (const cmd of plan.commands) {
        await dispatchCommand(cmd);
    }

    for (const delayed of plan.delays || []) {
        await sleep(delayed.ms);
        await dispatchCommand(delayed.cmd);
    }
}
