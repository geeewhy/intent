"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Worker thread entrypoint used by ./index.ts to synchronously make an HTTP call to the "runner".
 */
const node_worker_threads_1 = require("node:worker_threads");
const client_1 = require("./client");
if (node_worker_threads_1.isMainThread) {
    throw new Error(`Imported ${__filename} from main thread`);
}
if (node_worker_threads_1.parentPort === null) {
    throw new TypeError(`${__filename} got a null parentPort`);
}
// Create a new parentPort variable that is not nullable to please TS
const parentPort = node_worker_threads_1.parentPort;
const baseUrl = process.env.TEMPORAL_DEBUGGER_PLUGIN_URL;
if (!baseUrl) {
    throw new Error('Missing TEMPORAL_DEBUGGER_PLUGIN_URL environment variable');
}
const client = new client_1.Client({ baseUrl });
parentPort.on('message', async (request) => {
    const { eventId, responseBuffer } = request;
    try {
        await client.post('current-wft-started', { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }, Buffer.from(JSON.stringify({ eventId })));
        Atomics.store(responseBuffer, 0, 1);
    }
    catch (err) {
        console.error(err);
        Atomics.store(responseBuffer, 0, 2);
    }
    finally {
        Atomics.notify(responseBuffer, 0, 1);
    }
});
//# sourceMappingURL=worker-thread.js.map