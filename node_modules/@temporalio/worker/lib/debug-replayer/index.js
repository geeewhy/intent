"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDebugReplayer = startDebugReplayer;
const node_worker_threads_1 = __importDefault(require("node:worker_threads"));
const proto_1 = require("@temporalio/proto");
const worker_1 = require("../worker");
const client_1 = require("./client");
let thread = undefined;
async function run(options) {
    const baseUrl = process.env.TEMPORAL_DEBUGGER_PLUGIN_URL;
    if (!baseUrl) {
        throw new Error('Missing TEMPORAL_DEBUGGER_PLUGIN_URL environment variable');
    }
    const client = new client_1.Client({ baseUrl });
    const response = await client.get('history');
    const history = proto_1.temporal.api.history.v1.History.decode(await client_1.Client.readAll(response), client_1.Client.contentLength(response));
    // Only create one per process.
    // Not caring about globals here for to get simpler DX, this isn't meant for production use cases.
    thread = thread || new node_worker_threads_1.default.Worker(require.resolve('./worker-thread'));
    const rejectedPromise = new Promise((_, reject) => {
        // Set the global notifyRunner runner function that can be used from the workflow interceptors.
        // The function makes an HTTP request to the runner in a separate thread and blocks the current thread until a
        // response is received.
        globalThis.notifyRunner = (wftStartEventId) => {
            const sab = new SharedArrayBuffer(4);
            const responseBuffer = new Int32Array(sab);
            thread?.postMessage({ eventId: wftStartEventId, responseBuffer });
            Atomics.wait(responseBuffer, 0, 0);
            if (responseBuffer[0] === 2) {
                // Error occurred (logged by worker thread)
                reject(new Error('Failed to call runner back'));
            }
        };
    });
    await Promise.race([
        rejectedPromise,
        worker_1.Worker.runReplayHistory({
            ...options,
            interceptors: {
                ...options.interceptors,
                workflowModules: [
                    // Inbound goes first so user can set breakpoints in own inbound interceptors.
                    require.resolve('./inbound-interceptor'),
                    ...(options.interceptors?.workflowModules ?? []),
                    // Outbound goes last - notifies the runner in the finally block, user-provided outbound interceptors are
                    // resumed after the interceptor methods resolve.
                    require.resolve('./outbound-interceptor'),
                ],
            },
        }, history),
    ]);
}
/**
 * Start a replayer for debugging purposes.
 *
 * Use this method to integrate the replayer with external debuggers like the Temporal VS Code debbuger extension.
 */
function startDebugReplayer(options) {
    run(options).then(() => {
        console.log('Replay completed successfully');
        process.exit(0);
    }, (err) => {
        console.error('Replay failed', err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map