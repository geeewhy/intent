"use strict";
/**
 * In-memory implementation of the EventStorePort for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventStore = void 0;
/**
 * In-memory implementation of the EventStorePort
 * Used for testing and development
 */
class InMemoryEventStore {
    constructor() {
        // Store events with key format: tenantId-aggregateType-aggregateId
        this.events = new Map();
        // Store snapshots with key format: tenantId-aggregateType-aggregateId
        this.snapshots = new Map();
    }
    /**
     * Generate a key for the store
     */
    key(tenantId, aggregateType, aggregateId) {
        return `${tenantId}-${aggregateType}-${aggregateId}`;
    }
    /**
     * Append events to the event store
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param events Events to append
     * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
     */
    async append(tenantId, aggregateType, aggregateId, events, expectedVersion) {
        if (events.length === 0)
            return;
        const key = this.key(tenantId, aggregateType, aggregateId);
        const existingEvents = this.events.get(key) || [];
        // Check current version for optimistic concurrency control
        const currentVersion = existingEvents.length;
        if (currentVersion !== expectedVersion) {
            throw new Error(`VersionConflictError: expected ${expectedVersion}, found ${currentVersion}`);
        }
        // Add version to each event
        const eventsWithVersion = events.map((event, index) => ({
            ...event,
            version: expectedVersion + index
        }));
        // Append events
        this.events.set(key, [...existingEvents, ...eventsWithVersion]);
        // Create snapshot every 10 events
        const newVersion = expectedVersion + events.length;
        if (newVersion >= 10 && (newVersion % 10 === 0)) {
            this.snapshots.set(key, {
                version: newVersion,
                snapshot: {
                    id: aggregateId,
                    version: newVersion
                    // Add other aggregate state here if needed
                },
                schemaVersion: 1 // Default schema version
            });
        }
    }
    /**
     * Load a snapshot for an aggregate
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @returns Snapshot version and state, or null if no snapshot exists
     */
    async loadSnapshot(tenantId, aggregateType, aggregateId) {
        const key = this.key(tenantId, aggregateType, aggregateId);
        const snapshot = this.snapshots.get(key);
        if (snapshot) {
            return {
                version: snapshot.version,
                state: snapshot.snapshot,
                schemaVersion: snapshot.schemaVersion
            };
        }
        return null;
    }
    /**
     * Load events for an aggregate
     * Pure event loader that loads events from a specific version.
     * @param tenantId Tenant ID
     * @param aggregateType Type of the aggregate
     * @param aggregateId ID of the aggregate
     * @param fromVersion Version to start loading events from (default: 0)
     * @returns Events and version, or null if aggregate doesn't exist
     */
    async load(tenantId, aggregateType, aggregateId, fromVersion = 0) {
        const key = this.key(tenantId, aggregateType, aggregateId);
        const allEvents = this.events.get(key) || [];
        // If no events, return null
        if (allEvents.length === 0) {
            return null;
        }
        // Filter events based on fromVersion
        const events = allEvents.filter(event => event.version > fromVersion);
        // Calculate the current version (max of fromVersion and highest event version)
        const maxEventVersion = events.length > 0
            ? Math.max(...events.map(e => e.version))
            : 0;
        const version = Math.max(fromVersion, maxEventVersion);
        return { events, version };
    }
    /**
     * Clear all data (for testing)
     */
    clear() {
        this.events.clear();
        this.snapshots.clear();
    }
}
exports.InMemoryEventStore = InMemoryEventStore;
//# sourceMappingURL=memory-event-store.js.map