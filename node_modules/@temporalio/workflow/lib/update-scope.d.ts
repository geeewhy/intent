import type { AsyncLocalStorage as ALS } from 'node:async_hooks';
/**
 * Option for constructing a UpdateScope
 */
export interface UpdateScopeOptions {
    /**
     *  A workflow-unique identifier for this update.
     */
    id: string;
    /**
     *  The update type name.
     */
    name: string;
}
export declare const AsyncLocalStorage: new <T>() => ALS<T>;
export declare class UpdateScope {
    /**
     *  A workflow-unique identifier for this update.
     */
    readonly id: string;
    /**
     *  The update type name.
     */
    readonly name: string;
    constructor(options: UpdateScopeOptions);
    /**
     * Activate the scope as current and run the update handler `fn`.
     *
     * @return the result of `fn`
     */
    run<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Get the current "active" update scope.
     */
    static current(): UpdateScope | undefined;
    /** Alias to `new UpdateScope({ id, name }).run(fn)` */
    static updateWithInfo<T>(id: string, name: string, fn: () => Promise<T>): Promise<T>;
}
/**
 * Disable the async local storage for updates.
 */
export declare function disableUpdateStorage(): void;
