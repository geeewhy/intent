import { GroupedObservable, ObservableInput, OperatorFunction } from 'rxjs';
interface StateAndOptionalOutput<T, O> {
    state: T;
    output?: O;
}
export type StateAndOutput<T, O> = Required<StateAndOptionalOutput<T, O>>;
export declare function mergeMapWithState<T, I, O>(fn: (state: T, input: I) => ObservableInput<StateAndOutput<T, O>>, initialState: T, concurrency?: number): OperatorFunction<I, O>;
export declare function mapWithState<T, I, O>(fn: (state: T, input: I) => StateAndOutput<T, O>, initialState: T): OperatorFunction<I, O>;
export interface CloseableGroupedObservable<K, T> extends GroupedObservable<K, T> {
    close(): void;
}
/**
 * An RX OperatorFunction similar to `groupBy`.
 * The returned GroupedObservable has a `close()` method.
 */
export declare function closeableGroupBy<K extends string | number | undefined, T>(keyFunc: (t: T) => K): OperatorFunction<T, CloseableGroupedObservable<K, T>>;
export {};
