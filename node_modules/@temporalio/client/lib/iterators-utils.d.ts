import 'abort-controller/polyfill';
export interface MapAsyncOptions {
    /**
     * How many items to map concurrently. If set to less than 2 (or not set), then items are not mapped concurrently.
     *
     * When items are mapped concurrently, mapped items are returned by the resulting iterator in the order they complete
     * mapping, not the order in which the corresponding source items were obtained from the source iterator.
     *
     * @default 1 (ie. items are not mapped concurrently)
     */
    concurrency?: number;
    /**
     * Maximum number of mapped items to keep in buffer, ready for consumption.
     *
     * Ignored unless `concurrency > 1`. No limit applies if set to `undefined`.
     *
     * @default unlimited
     */
    bufferLimit?: number | undefined;
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
export declare function mapAsyncIterable<A, B>(source: AsyncIterable<A>, mapFn: (val: A) => Promise<B>, options?: MapAsyncOptions): AsyncIterable<B>;
