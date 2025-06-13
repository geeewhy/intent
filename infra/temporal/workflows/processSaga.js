"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSaga = processSaga;
// processSaga.ts
const workflow_1 = require("@temporalio/workflow");
const domains_1 = require("../../../core/domains");
const externalCommandSignal = (0, workflow_1.defineSignal)('externalCommand');
const externalEventSignal = (0, workflow_1.defineSignal)('externalEvent');
const { dispatchCommand, generateUUID } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '1 minute',
});
// TTL in milliseconds for the workflow to stay alive after last activity
const WORKFLOW_TTL_IN_MS = 1000;
const WORKFLOW_TTL_INTERVAL_IN_MS = 300;
/**
 * Main saga processor workflow
 */
async function processSaga(initialInput) {
    const sagaDef = findSaga(initialInput);
    if (!sagaDef) {
        console.warn(`[processSaga] No matching saga for: ${initialInput.type}`);
        return;
    }
    let planExecuted = false;
    let lastActivityTime = Date.now();
    // Handler for command signals
    (0, workflow_1.setHandler)(externalCommandSignal, async (cmd) => {
        console.log(`[processSaga] Received command signal: ${cmd.type}`);
        lastActivityTime = Date.now();
        const plan = await sagaDef.plan(cmd, { nextId: generateUUID });
        console.log(`[processSaga] Got command-triggered plan`, plan);
        await executePlan(plan);
        planExecuted = true;
    });
    // Handler for event signals
    (0, workflow_1.setHandler)(externalEventSignal, async (event) => {
        console.log(`[processSaga] Received event signal: ${event.type}`);
        lastActivityTime = Date.now();
        const plan = await sagaDef.plan(event, { nextId: generateUUID });
        console.log(`[processSaga] Got event-triggered plan`, plan);
        await executePlan(plan);
        planExecuted = true;
    });
    // Keep workflow alive until TTL expires
    await (0, workflow_1.condition)(() => planExecuted);
    //keep it alive for TTL
    while (true) {
        await (0, workflow_1.sleep)(WORKFLOW_TTL_INTERVAL_IN_MS);
        if (Date.now() - lastActivityTime > WORKFLOW_TTL_IN_MS) {
            console.log(`[processSaga] Workflow TTL expired after ${WORKFLOW_TTL_IN_MS}ms of inactivity`);
            break;
        }
    }
    await (0, workflow_1.condition)(workflow_1.allHandlersFinished);
}
/**
 * Helper: Locate matching saga for a given input (command or event)
 */
function findSaga(input) {
    return Object.values(domains_1.SagaRegistry).find((saga) => saga.idFor(input));
}
/**
 * Execute a saga plan
 */
async function executePlan(plan) {
    console.log(`[processSaga] Executing plan with ${plan.commands.length} commands and ${plan.delays?.length || 0} delays`);
    for (const cmd of plan.commands) {
        await dispatchCommand(cmd);
    }
    for (const delayed of plan.delays || []) {
        await (0, workflow_1.sleep)(delayed.ms);
        await dispatchCommand(delayed.cmd);
    }
}
//# sourceMappingURL=processSaga.js.map