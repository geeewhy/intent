"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_worker_threads_1 = require("node:worker_threads");
const common_1 = require("@temporalio/common");
const reusable_vm_1 = require("./reusable-vm");
const vm_1 = require("./vm");
if (node_worker_threads_1.isMainThread) {
    throw new common_1.IllegalStateError(`Imported ${__filename} from main thread`);
}
if (node_worker_threads_1.parentPort === null) {
    throw new TypeError(`${__filename} got a null parentPort`);
}
// Create a new parentPort variable that is not nullable to please TS
const parentPort = node_worker_threads_1.parentPort;
function ok(requestId) {
    return { requestId, result: { type: 'ok' } };
}
let workflowCreator;
let workflowGetter;
/**
 * Process a `WorkerThreadRequest` and resolve with a `WorkerThreadResponse`.
 */
async function handleRequest({ requestId, input }) {
    switch (input.type) {
        case 'init':
            if (input.reuseV8Context) {
                workflowCreator = await reusable_vm_1.ReusableVMWorkflowCreator.create(input.workflowBundle, input.isolateExecutionTimeoutMs, input.registeredActivityNames);
                workflowGetter = (runId) => reusable_vm_1.ReusableVMWorkflowCreator.workflowByRunId.get(runId);
            }
            else {
                workflowCreator = await vm_1.VMWorkflowCreator.create(input.workflowBundle, input.isolateExecutionTimeoutMs, input.registeredActivityNames);
                workflowGetter = (runId) => vm_1.VMWorkflowCreator.workflowByRunId.get(runId);
            }
            return ok(requestId);
        case 'destroy':
            await workflowCreator?.destroy();
            return ok(requestId);
        case 'create-workflow': {
            if (workflowCreator === undefined) {
                throw new common_1.IllegalStateError('No WorkflowCreator in Worker thread');
            }
            await workflowCreator.createWorkflow(input.options);
            return ok(requestId);
        }
        case 'activate-workflow': {
            const workflow = workflowGetter(input.runId);
            if (workflow === undefined) {
                throw new common_1.IllegalStateError(`Tried to activate non running workflow with runId: ${input.runId}`);
            }
            const completion = await workflow.activate(input.activation);
            return {
                requestId,
                result: { type: 'ok', output: { type: 'activation-completion', completion } },
            };
        }
        case 'extract-sink-calls': {
            const workflow = workflowGetter(input.runId);
            if (workflow === undefined) {
                throw new common_1.IllegalStateError(`Tried to activate non running workflow with runId: ${input.runId}`);
            }
            const calls = await workflow.getAndResetSinkCalls();
            calls.map((call) => {
                // Delete .now because functions can't be serialized / sent to thread.
                // Do this on a copy of the object, as workflowInfo is the live object.
                call.workflowInfo = {
                    ...call.workflowInfo,
                    unsafe: { ...call.workflowInfo.unsafe },
                };
                delete call.workflowInfo.unsafe.now;
            });
            return {
                requestId,
                result: { type: 'ok', output: { type: 'sink-calls', calls } },
            };
        }
        case 'dispose-workflow': {
            const workflow = workflowGetter(input.runId);
            if (workflow === undefined) {
                throw new common_1.IllegalStateError(`Tried to dispose non running workflow with runId: ${input.runId}`);
            }
            await workflow.dispose();
            return ok(requestId);
        }
    }
}
/**
 * Listen on messages delivered from the parent thread (the SDK Worker),
 * process any requests and respond back with result or error.
 */
parentPort.on('message', async (request) => {
    try {
        parentPort.postMessage(await handleRequest(request));
    }
    catch (err) {
        parentPort.postMessage({
            requestId: request.requestId,
            result: { type: 'error', message: err.message, name: err.name, stack: err.stack },
        });
    }
});
//# sourceMappingURL=workflow-worker-thread.js.map