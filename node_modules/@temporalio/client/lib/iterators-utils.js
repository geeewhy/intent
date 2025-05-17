"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAsyncIterable = mapAsyncIterable;
require("abort-controller/polyfill"); // eslint-disable-line import/no-unassigned-import
const node_events_1 = require("node:events");
const type_helpers_1 = require("@temporalio/common/lib/type-helpers");
function toAsyncIterator(iterable) {
    return iterable[Symbol.asyncIterator]();
}
/**
 * Return an async iterable that transforms items from a source iterable by mapping each item
 * through a mapping function.
 *
 * If `concurrency > 1`, then up to `concurrency` items may be mapped concurrently. In that case,
 * items are returned by the resulting iterator in the order they complete processing, not the order
 * in which the corresponding source items were obtained from the source iterator.
 *
 * @param source the source async iterable
 * @param mapFn a mapping function to apply on every item of the source iterable
 */
async function* mapAsyncIterable(source, mapFn, options) {
    const { concurrency, bufferLimit } = options ?? {};
    if (!concurrency || concurrency < 2) {
        for await (const x of source) {
            yield mapFn(x);
        }
        return;
    }
    const sourceIterator = toAsyncIterator(source);
    const emitter = new node_events_1.EventEmitter();
    const controller = new AbortController();
    const emitterEventsIterable = (0, node_events_1.on)(emitter, 'result', { signal: controller.signal });
    const emitterError = (0, node_events_1.once)(emitter, 'error');
    const bufferLimitSemaphore = typeof bufferLimit === 'number'
        ? (() => {
            const releaseEvents = toAsyncIterator((0, node_events_1.on)(emitter, 'released', { signal: controller.signal }));
            let value = bufferLimit + concurrency;
            return {
                acquire: async () => {
                    while (value <= 0) {
                        await Promise.race([releaseEvents.next(), emitterError]);
                    }
                    value--;
                },
                release: () => {
                    value++;
                    emitter.emit('released');
                },
            };
        })()
        : undefined;
    const mapper = async () => {
        for (;;) {
            await bufferLimitSemaphore?.acquire();
            const val = await Promise.race([sourceIterator.next(), emitterError]);
            if (Array.isArray(val))
                return;
            if (val?.done)
                return;
            emitter.emit('result', await mapFn(val.value));
        }
    };
    const mappers = Array(concurrency)
        .fill(mapper)
        .map((f) => f());
    Promise.all(mappers).then(() => controller.abort(), (err) => emitter.emit('error', err));
    try {
        for await (const [res] of emitterEventsIterable) {
            bufferLimitSemaphore?.release();
            yield res;
        }
    }
    catch (err) {
        if ((0, type_helpers_1.isAbortError)(err)) {
            return;
        }
        throw err;
    }
}
//# sourceMappingURL=iterators-utils.js.map