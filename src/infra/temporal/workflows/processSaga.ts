// processSaga.ts
import {
    defineSignal,
    proxyActivities,
    setHandler,
    sleep,
    condition
} from '@temporalio/workflow';
import type { Command, Event } from '../../../core/contracts';
import { SagaRegistry } from '../../../core/domains';
import type { SagaDefinition } from '../../../core/contracts';
import type { DomainActivities } from '../../../core/activities/types';
import * as coreActivities from '../activities/coreActivities';

const externalCommandSignal = defineSignal<[Command]>('externalCommand');
const externalEventSignal = defineSignal<[Event]>('externalEvent');

const { dispatchCommand, generateUUID } = proxyActivities<DomainActivities & typeof coreActivities>({
    startToCloseTimeout: '1 minute',
});

// TTL in milliseconds for the workflow to stay alive after last activity
const WORKFLOW_TTL_IN_MS = 1000;
const WORKFLOW_TTL_INTERVAL_IN_MS = 300;

/**
 * Main saga processor workflow
 */
export async function processSaga(initialInput: Command | Event): Promise<void> {
    const sagaDef = findSaga(initialInput);
    if (!sagaDef) {
        console.warn(`[processSaga] No matching saga for: ${initialInput.type}`);
        return;
    }

    let planExecuted = false;
    let lastActivityTime = Date.now();

    // Handler for command signals
    setHandler(externalCommandSignal, async (cmd) => {
        console.log(`[processSaga] Received command signal: ${cmd.type}`);
        lastActivityTime = Date.now();
        const plan = await sagaDef.plan(cmd, { nextId: generateUUID });
        console.log(`[processSaga] Got command-triggered plan`, plan);
        await executePlan(plan);
        planExecuted = true;
    });

    // Handler for event signals
    setHandler(externalEventSignal, async (event) => {
        console.log(`[processSaga] Received event signal: ${event.type}`);
        lastActivityTime = Date.now();
        const plan = await sagaDef.plan(event, { nextId: generateUUID });
        console.log(`[processSaga] Got event-triggered plan`, plan);
        await executePlan(plan);
        planExecuted = true;
    });

    // Keep workflow alive until TTL expires
    await condition(() => planExecuted);

    //keep it alive for TTL
    while (true) {
        await sleep(WORKFLOW_TTL_INTERVAL_IN_MS);
        if (Date.now() - lastActivityTime > WORKFLOW_TTL_IN_MS) {
            console.log(`[processSaga] Workflow TTL expired after ${WORKFLOW_TTL_IN_MS}ms of inactivity`);
            break;
        }
    }
}

/**
 * Helper: Locate matching saga for a given input (command or event)
 */
function findSaga(input: Command | Event): SagaDefinition | undefined {
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
