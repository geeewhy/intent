/**
 * In-memory implementation of the EventStorePort for testing
 */

import { Event, UUID } from '../../core/contracts';
import { EventStorePort } from '../../core/ports';

/**
 * In-memory implementation of the EventStorePort
 * Used for testing and development
 */
export class InMemoryEventStore implements EventStorePort {
  // Store events with key format: tenantId-aggregateType-aggregateId
  private events = new Map<string, Event[]>();
  
  // Store snapshots with key format: tenantId-aggregateType-aggregateId
  private snapshots = new Map<string, { version: number, snapshot: any }>();

  /**
   * Generate a key for the store
   */
  private key(tenantId: UUID, aggregateType: string, aggregateId: UUID): string {
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
  async append(tenantId: UUID, aggregateType: string, aggregateId: UUID, events: Event[], expectedVersion: number): Promise<void> {
    if (events.length === 0) return;

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
    
    // Create snapshot every 10 events
    const newVersion = expectedVersion + events.length;
    if (newVersion >= 10 && (newVersion % 10 === 0)) {
      this.snapshots.set(key, {
        version: newVersion,
        snapshot: {
          id: aggregateId,
          version: newVersion
          // Add other aggregate state here if needed
        }
      });
    }
  }

  /**
   * Load events for an aggregate
   * First checks if a snapshot exists. If so, loads snapshot + replays only newer events.
   * Otherwise, replays from event 0.
   * @param tenantId Tenant ID
   * @param aggregateType Type of the aggregate
   * @param aggregateId ID of the aggregate
   * @returns Events and version, or null if aggregate doesn't exist
   */
  async load(tenantId: UUID, aggregateType: string, aggregateId: UUID): Promise<{ events: Event[]; version: number } | null> {
    const key = this.key(tenantId, aggregateType, aggregateId);
    const allEvents = this.events.get(key) || [];
    
    // If no events, return null
    if (allEvents.length === 0) {
      return null;
    }
    
    // Check if a snapshot exists
    const snapshot = this.snapshots.get(key);
    let events: Event[] = [];
    let version: number;
    
    if (snapshot) {
      // If snapshot exists, only return events after the snapshot version
      events = allEvents.filter(event => event.version > snapshot.version);
      version = snapshot.version + events.length;
    } else {
      // If no snapshot, return all events
      events = [...allEvents];
      version = events.length;
    }
    
    return { events, version };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.events.clear();
    this.snapshots.clear();
  }
}