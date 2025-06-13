import { UUID, Event } from "../contracts";
/**
 * Generic base class for aggregates
 */
export declare abstract class BaseAggregate<TState> {
    id: UUID;
    abstract aggregateType: string;
    version: number;
    constructor(id: UUID);
    static CURRENT_SCHEMA_VERSION: number;
    protected upcastSnapshotState?(raw: any, version: number): TState;
    applySnapshotState(raw: any, incomingVersion?: number): void;
    protected abstract applyUpcastedSnapshot(state: TState): void;
    abstract extractSnapshotState(): TState;
    toSnapshot(): Snapshot<TState>;
    static fromSnapshot<T extends BaseAggregate<any>>(this: new (id: UUID) => T, event: any): T;
    abstract apply(event: any, isSnapshot?: boolean): void;
    abstract handle(command: any): Event[];
}
/**
 * Snapshot payload format shared across aggregates
 */
export interface Snapshot<T> {
    id: UUID;
    type: string;
    state: T;
    createdAt: string;
    schemaVersion: number;
    version?: number;
}
