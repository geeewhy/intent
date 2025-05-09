//src/core/base/aggregate.ts
import {UUID} from "../contracts";

/**
 * Generic base class for aggregates
 */
export abstract class BaseAggregate<TState> {
    abstract aggregateType: string;
    version = 0;

    constructor(public id: UUID) {}

    abstract extractSnapshotState(): TState;
    abstract applySnapshotState(state: TState): void;

    toSnapshot(): Snapshot<TState> {
        return {
            id: this.id,
            type: this.aggregateType,
            state: this.extractSnapshotState(),
            createdAt: new Date().toISOString(),
        };
    }

    static fromSnapshot<T extends BaseAggregate<any>>(this: new (id: UUID) => T, event: any): T {
        const instance = new this(event.payload.id);
        instance.version = event.version;
        instance.applySnapshotState(event.payload.state);
        return instance;
    }

    abstract apply(event: any, isSnapshot?: boolean): void;
}

/**
 * Snapshot payload format shared across aggregates
 */
export interface Snapshot<T> {
    id: UUID;
    type: string;
    state: T;
    createdAt: string;
}