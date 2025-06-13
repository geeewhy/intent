"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAggregate = void 0;
/**
 * Generic base class for aggregates
 */
class BaseAggregate {
    constructor(id) {
        this.id = id;
        this.version = 0;
    }
    // Default is identity (can override in subclass)
    upcastSnapshotState(raw, version) {
        return raw;
    }
    applySnapshotState(raw, incomingVersion) {
        const targetVersion = this.constructor.CURRENT_SCHEMA_VERSION;
        const inputVersion = incomingVersion ?? targetVersion;
        const upcasted = this.upcastSnapshotState
            ? this.upcastSnapshotState(raw, inputVersion)
            : raw;
        this.applyUpcastedSnapshot(upcasted);
    }
    toSnapshot() {
        return {
            id: this.id,
            type: this.aggregateType,
            state: this.extractSnapshotState(),
            createdAt: new Date().toISOString(),
            schemaVersion: this.constructor.CURRENT_SCHEMA_VERSION,
        };
    }
    static fromSnapshot(event) {
        const instance = new this(event.payload.id);
        instance.version = event.version;
        instance.applySnapshotState(event.payload.state, event.payload.schemaVersion);
        return instance;
    }
}
exports.BaseAggregate = BaseAggregate;
// Schema versioning
BaseAggregate.CURRENT_SCHEMA_VERSION = 1;
//# sourceMappingURL=aggregate.js.map