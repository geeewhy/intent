import { v4 as uuid } from 'uuid';

interface TraceNode {
  id: string;
  type: 'Event' | 'Command' | 'Snapshot';
  subtype: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  aggregateId?: string;
  tenantId: string;
  level?: number;
}

export function makeTrace(overrides?: Partial<TraceNode>): TraceNode {
  const types: Array<'Event' | 'Command' | 'Snapshot'> = ['Event', 'Command', 'Snapshot'];
  const subtypes = {
    Event: ['UserCreated', 'OrderPlaced', 'PaymentProcessed', 'UserUpdated', 'ProductCreated', 'OrderCancelled', 'PaymentRefunded', 'InventoryReserved', 'WelcomeEmailSent'],
    Command: ['CreateUser', 'PlaceOrder', 'ProcessPayment', 'UpdateUser', 'CreateProduct', 'CancelOrder', 'ProcessRefund', 'UpdateInventory'],
    Snapshot: ['UserAggregate', 'OrderAggregate', 'PaymentAggregate', 'ProductAggregate', 'InventoryAggregate']
  };

  const type = overrides?.type || types[Math.floor(Math.random() * types.length)];
  const subtype = overrides?.subtype || subtypes[type][Math.floor(Math.random() * subtypes[type].length)];
  
  const now = new Date();
  const defaultTrace: TraceNode = {
    id: `${type.toLowerCase()}-${uuid().substring(0, 8)}`,
    type,
    subtype,
    timestamp: now.toISOString(),
    correlationId: `corr-${uuid().substring(0, 8)}`,
    causationId: Math.random() > 0.3 ? `cmd-${uuid().substring(0, 8)}` : undefined,
    aggregateId: Math.random() > 0.2 ? `agg-${uuid().substring(0, 8)}` : undefined,
    tenantId: Math.random() > 0.5 ? 'tenant-1' : 'tenant-2',
    level: Math.floor(Math.random() * 5)
  };

  return { ...defaultTrace, ...overrides };
}