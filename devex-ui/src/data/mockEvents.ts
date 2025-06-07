//devex-ui/src/data/mockEvents.ts

import type { Event, Metadata } from './types';

export const mockEvents: Event[] = [
  {
    id: 'evt-001',
    tenant_id: 'tenant-1',
    type: 'UserCreated',
    payload: { email: 'user@example.com', name: 'John Doe' },
    aggregateId: 'user-123',
    aggregateType: 'User',
    version: 1,
    status: 'processed',
    metadata: {
      userId: 'admin-1',
      role: 'admin',
      timestamp: new Date('2024-01-15T10:30:15Z'),
      correlationId: 'corr-001',
      causationId: 'cmd-001',
      requestId: 'req-001',
      source: 'web-api',
      tags: { environment: 'production', channel: 'web' },
      schemaVersion: 1
    }
  },
  {
    id: 'evt-002',
    tenant_id: 'tenant-1',
    type: 'OrderPlaced',
    payload: { items: [{ productId: 'prod-1', quantity: 2 }], total: 29.99 },
    aggregateId: 'order-456',
    aggregateType: 'Order',
    version: 1,
    status: 'processed',
    metadata: {
      userId: 'user-123',
      role: 'user',
      timestamp: new Date('2024-01-15T10:29:30Z'),
      correlationId: 'corr-002',
      causationId: 'cmd-002',
      requestId: 'req-002',
      source: 'mobile-app',
      tags: { channel: 'mobile', version: '1.2.0' },
      schemaVersion: 1
    }
  },
  {
    id: 'evt-003',
    tenant_id: 'tenant-2',
    type: 'PaymentProcessed',
    payload: { amount: 29.99, method: 'credit_card', status: 'completed' },
    aggregateId: 'payment-789',
    aggregateType: 'Payment',
    version: 1,
    status: 'processed',
    metadata: {
      userId: 'system',
      role: 'system',
      timestamp: new Date('2024-01-15T10:28:45Z'),
      correlationId: 'corr-003',
      causationId: 'cmd-003',
      requestId: 'req-003',
      source: 'payment-service',
      tags: { processor: 'stripe' },
      schemaVersion: 1
    }
  },
  {
    id: 'evt-004',
    tenant_id: 'tenant-1',
    type: 'UserUpdated',
    payload: { userId: 'user-123', email: 'newemail@example.com' },
    aggregateId: 'user-123',
    aggregateType: 'User',
    version: 2,
    status: 'processed',
    metadata: {
      userId: 'admin-1',
      role: 'admin',
      timestamp: new Date('2024-01-15T11:00:00Z'),
      correlationId: 'corr-004',
      causationId: 'cmd-004',
      requestId: 'req-004',
      source: 'web-api',
      tags: { environment: 'production' },
      schemaVersion: 1
    }
  },
  {
    id: 'evt-005',
    tenant_id: 'tenant-2',
    type: 'ProductCreated',
    payload: { name: 'Widget Pro', price: 99.99, category: 'electronics' },
    aggregateId: 'product-101',
    aggregateType: 'Product',
    version: 1,
    status: 'processed',
    metadata: {
      userId: 'merchant-456',
      role: 'merchant',
      timestamp: new Date('2024-01-15T09:45:00Z'),
      correlationId: 'corr-005',
      causationId: 'cmd-005',
      requestId: 'req-005',
      source: 'merchant-portal',
      tags: { channel: 'web', category: 'catalog' },
      schemaVersion: 1
    }
  }
];

// Simulate event stream
export const createEventStream = (tenantId?: string) => {
  const eventTypes = ['UserUpdated', 'OrderCancelled', 'PaymentRefunded', 'ProductUpdated', 'InventoryChanged'];
  const aggregateTypes = ['User', 'Order', 'Payment', 'Product', 'Inventory'];
  const sources = ['web-api', 'mobile-app', 'payment-service', 'inventory-service', 'notification-service'];

  return {
    subscribe: (callback: (event: Event) => void) => {
      const interval = setInterval(() => {
        const newEvent: Event = {
          id: `evt-${Date.now()}`,
          tenant_id: tenantId || (Math.random() > 0.5 ? 'tenant-1' : 'tenant-2'),
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          payload: { 
            randomData: Math.random(), 
            timestamp: new Date(),
            value: Math.floor(Math.random() * 1000)
          },
          aggregateId: `aggregate-${Math.random().toString(36).substr(2, 6)}`,
          aggregateType: aggregateTypes[Math.floor(Math.random() * aggregateTypes.length)],
          version: Math.floor(Math.random() * 5) + 1,
          status: 'processed',
          metadata: {
            userId: `user-${Math.random().toString(36).substr(2, 6)}`,
            role: Math.random() > 0.7 ? 'admin' : 'user',
            timestamp: new Date(),
            correlationId: `corr-${Math.random().toString(36).substr(2, 8)}`,
            causationId: `cmd-${Math.random().toString(36).substr(2, 8)}`,
            requestId: `req-${Math.random().toString(36).substr(2, 8)}`,
            source: sources[Math.floor(Math.random() * sources.length)],
            tags: { automated: 'true', stream: 'true' },
            schemaVersion: 1
          }
        };
        callback(newEvent);
      }, 3000);

      return () => clearInterval(interval);
    }
  };
};

// Fake fetch function for events
export const fetchEvents = async (tenantId: string, limit = 50): Promise<Event[]> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  return mockEvents
    .filter(event => event.tenant_id === tenantId)
    .slice(0, limit);
};

// Fake fetch function for specific event
export const fetchEvent = async (eventId: string): Promise<Event | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return mockEvents.find(event => event.id === eventId) || null;
};
