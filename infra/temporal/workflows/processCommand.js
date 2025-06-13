"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCommand = processCommand;
const workflow_1 = require("@temporalio/workflow");
const commandSignal = (0, workflow_1.defineSignal)('command');
const obsTraceSignal = (0, workflow_1.defineSignal)('obs.trace');
const { getEventsForCommand, routeEvent, applyEvents, projectEvents, emitObservabilitySpan, } = (0, workflow_1.proxyActivities)({
    startToCloseTimeout: '1 minute',
});
const WORKFLOW_TTL_IN_MS = 1000;
async function processCommand(
//todo check if temporal works with fn footprint, even not utilized
tenantId, aggregateType, aggregateId) {
    const commandQueue = [];
    let lastCommandId = null;
    (0, workflow_1.setHandler)(commandSignal, (cmd) => {
        commandQueue.push(cmd);
    });
    //todo doesnt belong here, start a separate flow
    (0, workflow_1.setHandler)(obsTraceSignal, async ({ span, data }) => {
        await emitObservabilitySpan(span, data);
    });
    while (true) {
        while (commandQueue.length > 0) {
            const cmd = commandQueue.shift();
            if (!cmd || cmd.id === lastCommandId)
                continue;
            lastCommandId = cmd.id;
            const { events = [], status, error } = await getEventsForCommand(cmd);
            if (status === 'fail')
                return { status, error };
            await applyEvents(cmd.tenant_id, cmd.payload.aggregateType, cmd.payload.aggregateId, events);
            await projectEvents(events);
            for (const evt of events) {
                await routeEvent(evt);
            }
        }
        const alive = await (0, workflow_1.condition)(() => commandQueue.length > 0, WORKFLOW_TTL_IN_MS);
        if (!alive)
            break;
    }
    return { status: 'success' };
}
//# sourceMappingURL=processCommand.js.map