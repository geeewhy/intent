/**
 * In-memory implementation of the EventStorePort for testing
 */

import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';
import { BaseAggregate, Snapshot } from '../../core/shared/aggregate';

export const SNAPSHOT_EVERY = 2;

/**
 * In-memory implementation of the EventStorePort
 * Used for testing and development
 */
export class InMemoryEventStore implements EventStorePort {
  // Store events with key format: tenantId-aggregateType-aggregateId
  private events = new Map<string, Event[]>();

  // Store snapshots with key format: tenantId-aggregateType-aggregateId
  private snapshots = new Map<string, { version: number, snapshot: any, schemaVersion: number, createdAt: string }>();

  /**
   * Generate a key for the store
   */
  private key(tenantId: UUID, aggregateType: string, aggregateId: UUID): string {
    return `${tenantId}-${aggregateType}-${aggregateId}`;
  }

  /**
   * DEPRECATED: Use append instead
   *
   * Create or update a snapshot for an aggregate
   * @param tenantId Tenant ID
   * @param aggregate Aggregate instance to snapshot
   */
  async snapshotAggregate(tenantId: UUID, aggregate: BaseAggregate<any>): Promise<void> {
    const snapshot = aggregate.toSnapshot();
    const key = this.key(tenantId, snapshot.type, snapshot.id);

    this.snapshots.set(key, {
      version: aggregate.version,
      snapshot: snapshot.state,
      schemaVersion: snapshot.schemaVersion,
      createdAt: snapshot.createdAt
    });
  }

  /**
   * Append events to the event store
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @param events Events to append
   * @param expectedVersion Expected version of the aggregate (for optimistic concurrency)
   * @param snapshot Optional snapshot to persist, atomic with events
   */
  async append(
    tenantId: UUID, 
    aggregateType: string, 
    aggregateId: UUID, 
    events: Event[], 
    expectedVersion: number,
    snapshot?: Snapshot<any>
  ): Promise<void> {
    if (events.length === 0 && !snapshot) return;

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
      version: expectedVersion + index + 1
    }));

    // Append events
    this.events.set(key, [...existingEvents, ...eventsWithVersion]);

    // Calculate number of events added
    const numberEvents = events.length;
    const newVersion = expectedVersion + numberEvents;

    // Save snapshot (if provided) or create one automatically
    const crossedSnapshotThreshold =
      snapshot &&
      Math.floor((expectedVersion + numberEvents) / SNAPSHOT_EVERY) >
      Math.floor(expectedVersion / SNAPSHOT_EVERY);

    if (crossedSnapshotThreshold) {
      // If we have an explicit snapshot, use it
      const existingSnapshot = this.snapshots.get(key);

      // Only update if no existing snapshot or new version is higher
      if (!existingSnapshot || (snapshot.version !== undefined && existingSnapshot.version < snapshot.version)) {
        this.snapshots.set(key, {
          version: snapshot.version ?? newVersion,
          snapshot: snapshot.state,
          schemaVersion: snapshot.schemaVersion,
          createdAt: snapshot.createdAt
        });
      }
    }
  }

  /**
   * Load a snapshot for an aggregate
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @returns Snapshot version and state, or null if no snapshot exists
   */
  async loadSnapshot(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ version: number; state: any; schemaVersion: number } | null> {
    try {
      const key = this.key(tenantId, aggregateType, aggregateId);
      const snapshot = this.snapshots.get(key);

      if (snapshot) {
        return {
          version: snapshot.version,
          state: snapshot.snapshot,
          schemaVersion: snapshot.schemaVersion ?? 1
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to load snapshot', { 
        tenantId, 
        aggregateType, 
        aggregateId, 
        error 
      });
      throw error;
    }
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
  async load(tenantId: UUID, aggregateType: string, aggregateId: UUID, fromVersion = 0): Promise<{ events: Event[]; version: number } | null> {
    try {
      const key = this.key(tenantId, aggregateType, aggregateId);
      const allEvents = this.events.get(key) || [];

      // If no events and fromVersion is 0, return null (aggregate doesn't exist)
      if (allEvents.length === 0 && fromVersion === 0) {
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
    } catch (error) {
      console.error('Failed to load events', { 
        tenantId, 
        aggregateType, 
        aggregateId, 
        fromVersion,
        error 
      });
      throw error;
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.events.clear();
    this.snapshots.clear();
  }

  /**
   * Close the event store connection
   * No-op for in-memory implementation, but included for interface compatibility
   */
  async close(): Promise<void> {
    // No-op for in-memory implementation
  }
}
