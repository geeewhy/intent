import { v4 as uuid } from 'uuid';
import type { Event, Metadata } from '@/data/types';

export function makeEvent(overrides?: Partial<Event>): Event {
  const eventTypes = ['UserCreated', 'OrderPlaced', 'PaymentProcessed', 'UserUpdated', 'ProductCreated', 'OrderCancelled', 'PaymentRefunded', 'ProductUpdated', 'InventoryChanged'];
  const aggregateTypes = ['User', 'Order', 'Payment', 'Product', 'Inventory'];
  const sources = ['web-api', 'mobile-app', 'payment-service', 'inventory-service', 'notification-service'];

  const defaultMetadata: Metadata = {
    userId: `user-${uuid().substring(0, 8)}`,
    role: Math.random() > 0.7 ? 'admin' : 'user',
    timestamp: new Date(),
    correlationId: `corr-${uuid().substring(0, 8)}`,
    causationId: `cmd-${uuid().substring(0, 8)}`,
    requestId: `req-${uuid().substring(0, 8)}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    tags: { environment: 'production', channel: Math.random() > 0.5 ? 'web' : 'mobile' },
    schemaVersion: 1
  };

  const defaultEvent: Event = {
    id: `evt-${uuid()}`,
    tenant_id: Math.random() > 0.5 ? 'tenant-1' : 'tenant-2',
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    payload: { 
      randomData: Math.random(), 
      timestamp: new Date(),
      value: Math.floor(Math.random() * 1000)
    },
    aggregateId: `aggregate-${uuid().substring(0, 8)}`,
    aggregateType: aggregateTypes[Math.floor(Math.random() * aggregateTypes.length)],
    version: Math.floor(Math.random() * 5) + 1,
    status: 'processed',
    metadata: defaultMetadata
  };

  return { ...defaultEvent, ...overrides };
}