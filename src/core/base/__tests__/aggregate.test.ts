/**
 * Tests for the BaseAggregate class
 */

import { BaseAggregate, Snapshot } from '../aggregate';
import { Event, UUID } from '../../contracts';

// Define a simple state interface for our dummy aggregate
interface ExampleState {
  name: string;
  counter: number;
  items: string[];
}

// Define event types for our dummy aggregate
enum ExampleEventType {
  ITEM_ADDED = 'itemAdded',
  COUNTER_INCREMENTED = 'counterIncremented',
  NAME_CHANGED = 'nameChanged'
}

// Define event payloads
interface ItemAddedPayload {
  item: string;
}

interface CounterIncrementedPayload {
  amount: number;
}

interface NameChangedPayload {
  name: string;
}

/**
 * Dummy aggregate implementation for testing BaseAggregate functionality
 */
class ExampleAggregate extends BaseAggregate<ExampleState> {
  aggregateType = 'example';

  // Internal state
  private name: string = '';
  private counter: number = 0;
  private items: string[] = [];

  constructor(id: UUID) {
    super(id);
  }

  // Getters for testing
  getName(): string {
    return this.name;
  }

  getCounter(): number {
    return this.counter;
  }

  getItems(): string[] {
    return [...this.items]; // Return a copy to prevent direct mutation
  }

  // Implementation of abstract methods
  extractSnapshotState(): ExampleState {
    return {
      name: this.name,
      counter: this.counter,
      items: [...this.items]
    };
  }

  protected upcastSnapshotState(raw: any, version: number): ExampleState {
    // In this simple example, we don't need to upcast anything
    return raw;
  }

  protected applyUpcastedSnapshot(state: ExampleState): void {
    this.name = state.name;
    this.counter = state.counter;
    this.items = [...state.items];
  }

  apply(event: Event): void {
    // Increment version for each applied event
    this.version++;

    switch (event.type) {
      case ExampleEventType.ITEM_ADDED:
        const itemAddedPayload = event.payload as ItemAddedPayload;
        this.items.push(itemAddedPayload.item);
        break;

      case ExampleEventType.COUNTER_INCREMENTED:
        const counterIncrementedPayload = event.payload as CounterIncrementedPayload;
        this.counter += counterIncrementedPayload.amount;
        break;

      case ExampleEventType.NAME_CHANGED:
        const nameChangedPayload = event.payload as NameChangedPayload;
        this.name = nameChangedPayload.name;
        break;

      default:
        // Ignore unknown event types
        break;
    }
  }

  // Helper method to create events for testing
  static createItemAddedEvent(aggregateId: UUID, item: string): Event<ItemAddedPayload> {
    return {
      id: `event-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: 'test-tenant',
      type: ExampleEventType.ITEM_ADDED,
      aggregateId,
      version: 1,
      payload: { item }
    };
  }

  static createCounterIncrementedEvent(aggregateId: UUID, amount: number): Event<CounterIncrementedPayload> {
    return {
      id: `event-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: 'test-tenant',
      type: ExampleEventType.COUNTER_INCREMENTED,
      aggregateId,
      version: 1,
      payload: { amount }
    };
  }

  static createNameChangedEvent(aggregateId: UUID, name: string): Event<NameChangedPayload> {
    return {
      id: `event-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: 'test-tenant',
      type: ExampleEventType.NAME_CHANGED,
      aggregateId,
      version: 1,
      payload: { name }
    };
  }
}

describe('BaseAggregate', () => {
  describe('toSnapshot', () => {
    it('should create a snapshot with the correct structure', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const aggregate = new ExampleAggregate(aggregateId);

      // Apply some events to change the state
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'Test Aggregate'));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 5));
      aggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item1'));

      // Act
      const snapshot = aggregate.toSnapshot();

      // Assert
      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe(aggregateId);
      expect(snapshot.type).toBe('example');
      expect(snapshot.state).toBeDefined();
      expect(snapshot.state.name).toBe('Test Aggregate');
      expect(snapshot.state.counter).toBe(5);
      expect(snapshot.state.items).toEqual(['item1']);
      expect(snapshot.createdAt).toBeDefined();
      expect(typeof snapshot.createdAt).toBe('string');
      expect(snapshot.schemaVersion).toBe(1); // Default schema version
    });
  });

  describe('fromSnapshot', () => {
    it('should restore an aggregate from a snapshot', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const snapshotEvent = {
        payload: {
          id: aggregateId,
          state: {
            name: 'Restored Aggregate',
            counter: 10,
            items: ['item1', 'item2']
          }
        },
        version: 3
      };

      // Act
      const aggregate = ExampleAggregate.fromSnapshot(snapshotEvent);

      // Assert
      expect(aggregate).toBeDefined();
      expect(aggregate.id).toBe(aggregateId);
      expect(aggregate.version).toBe(3);
      expect(aggregate.getName()).toBe('Restored Aggregate');
      expect(aggregate.getCounter()).toBe(10);
      expect(aggregate.getItems()).toEqual(['item1', 'item2']);
    });
  });

  describe('apply', () => {
    it('should apply events and update the aggregate state', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const aggregate = new ExampleAggregate(aggregateId);

      // Act - Apply multiple events
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'New Name'));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 3));
      aggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item1'));
      aggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item2'));

      // Assert
      expect(aggregate.version).toBe(4); // Version should be incremented for each event
      expect(aggregate.getName()).toBe('New Name');
      expect(aggregate.getCounter()).toBe(3);
      expect(aggregate.getItems()).toEqual(['item1', 'item2']);
    });

    it('should handle events in the order they are applied', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const aggregate = new ExampleAggregate(aggregateId);

      // Act - Apply events in a specific order
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'First Name'));
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'Second Name'));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 5));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 3));

      // Assert
      expect(aggregate.getName()).toBe('Second Name'); // Last name change should win
      expect(aggregate.getCounter()).toBe(8); // Counter increments should accumulate
    });
  });

  describe('snapshot roundtrip', () => {
    it('should correctly restore an aggregate from its own snapshot', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const originalAggregate = new ExampleAggregate(aggregateId);

      // Apply some events to change the state
      originalAggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'Original Name'));
      originalAggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 7));
      originalAggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item1'));
      originalAggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item2'));

      // Create a snapshot
      const snapshot = originalAggregate.toSnapshot();

      // Create a snapshot event (simulating how it would be stored/retrieved)
      const snapshotEvent = {
        payload: {
          id: snapshot.id,
          state: snapshot.state
        },
        version: originalAggregate.version
      };

      // Act - Restore from snapshot
      const restoredAggregate = ExampleAggregate.fromSnapshot(snapshotEvent);

      // Assert
      expect(restoredAggregate.id).toBe(originalAggregate.id);
      expect(restoredAggregate.version).toBe(originalAggregate.version);
      expect(restoredAggregate.getName()).toBe(originalAggregate.getName());
      expect(restoredAggregate.getCounter()).toBe(originalAggregate.getCounter());
      expect(restoredAggregate.getItems()).toEqual(originalAggregate.getItems());
    });

    it('should correctly apply events after loading from a snapshot and update version', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';

      // Create a snapshot at version 3
      const snapshotEvent = {
        payload: {
          id: aggregateId,
          state: {
            name: 'Snapshot Name',
            counter: 5,
            items: ['snapshot-item1', 'snapshot-item2']
          }
        },
        version: 3 // Snapshot is at version 3
      };

      // Act - Restore from snapshot
      const aggregate = ExampleAggregate.fromSnapshot(snapshotEvent);

      // Initial state verification after loading from snapshot
      expect(aggregate.version).toBe(3);
      expect(aggregate.getName()).toBe('Snapshot Name');
      expect(aggregate.getCounter()).toBe(5);
      expect(aggregate.getItems()).toEqual(['snapshot-item1', 'snapshot-item2']);

      // Apply additional events after loading from snapshot
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'Updated Name'));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 3));
      aggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'new-item'));

      // Assert - Version should be snapshot version (3) + number of new events (3) = 6
      expect(aggregate.version).toBe(6);

      // State should reflect both snapshot and new events
      expect(aggregate.getName()).toBe('Updated Name'); // Updated by new event
      expect(aggregate.getCounter()).toBe(8); // 5 from snapshot + 3 from new event
      expect(aggregate.getItems()).toEqual(['snapshot-item1', 'snapshot-item2', 'new-item']); // Combined items
    });
  });
});
