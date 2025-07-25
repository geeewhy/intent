//src/core/base/aggregate.ts
import {UUID, Event, Command} from "../contracts";

/**
 * Interface for BaseAggregate
 */
export interface AggregateClass {
    new (id: string): any;
    create: (cmd: any) => any;
    rehydrate: (events: any[]) => any;
}

/**
 * Generic base class for aggregates
 */
export abstract class BaseAggregate<TState> {
    abstract aggregateType: string;
    version = 0;

    constructor(public id: UUID) {}

    // Schema versioning
    static CURRENT_SCHEMA_VERSION = 1;

    // Default is identity (can override in subclass)
    protected upcastSnapshotState?(raw: any, version: number): TState {
        return raw;
    }

    applySnapshotState(raw: any, incomingVersion?: number): void {
        const targetVersion = (this.constructor as any).CURRENT_SCHEMA_VERSION;
        const inputVersion = incomingVersion ?? targetVersion;

        const upcasted = this.upcastSnapshotState
            ? this.upcastSnapshotState(raw, inputVersion)
            : raw;

        this.applyUpcastedSnapshot(upcasted);
    }

    /**
     * completes decide & execute pattern
     * As an impure convenience function that executes a command and returns the resulting events.
     * todo might remove. useful for orchestrators (currently saga) or core tests executing consecutive commands.
     * @param cmd
     */
    execute<C extends Command = Command>(cmd: C): Event[] {
        const events = this.handle(cmd);
        this.fold(events);
        return events;
    }

    fold(events: Event[]) { events.forEach(e => this.apply(e)); }

    protected abstract applyUpcastedSnapshot(state: TState): void;

    abstract extractSnapshotState(): TState;

    toSnapshot(): Snapshot<TState> {
        return {
            id: this.id,
            type: this.aggregateType,
            state: this.extractSnapshotState(),
            createdAt: new Date().toISOString(),
            schemaVersion: (this.constructor as any).CURRENT_SCHEMA_VERSION,
        };
    }

    static fromSnapshot<T extends BaseAggregate<any>>(this: new (id: UUID) => T, event: any): T {
        const instance = new this(event.payload.id);
        instance.version = event.version;
        instance.applySnapshotState(event.payload.state, event.payload.schemaVersion);
        return instance;
    }

    abstract apply(event: any, isSnapshot?: boolean): void;

    abstract handle(command: any): Event[];

    getVersion():number {
        return this.version;
    };

    public getId(): UUID {
        return this.id;
    }
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
