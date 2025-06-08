import { v4 as uuid } from 'uuid';

export interface TraceNode {
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

export function makeTrace(overrides:Partial<TraceNode> = {}):TraceNode {
  if (overrides.correlationId) return single(overrides);

  const correlationId = `corr-${uuid().slice(0,8)}`;
  const root = single({ type:'Command', level:0, correlationId });

  const events = Array.from({length:3+Math.floor(Math.random()*3)})
    .map((_,i)=> single({
      type:'Event',
      causationId: root.id,
      level: i+1,
      correlationId
    }));

  const snap = single({
    type:'Snapshot',
    causationId: events.at(-1)!.id,
    level: events.length+1,
    correlationId
  });

  // return a random node from the cluster so seeding stays varied
  return [root, ...events, snap][Math.floor(Math.random()* (events.length+2))];

  function single(o:Partial<TraceNode>):TraceNode {
    return { ...defaultTrace(), ...o };
  }
}

function defaultTrace(): TraceNode {
  const types: Array<'Event' | 'Command' | 'Snapshot'> = ['Event', 'Command', 'Snapshot'];
  const subtypes = {
    Event: ['UserCreated', 'OrderPlaced', 'PaymentProcessed', 'UserUpdated', 'ProductCreated', 'OrderCancelled', 'PaymentRefunded', 'InventoryReserved', 'WelcomeEmailSent'],
    Command: ['CreateUser', 'PlaceOrder', 'ProcessPayment', 'UpdateUser', 'CreateProduct', 'CancelOrder', 'ProcessRefund', 'UpdateInventory'],
    Snapshot: ['UserAggregate', 'OrderAggregate', 'PaymentAggregate', 'ProductAggregate', 'InventoryAggregate']
  };

  const type = types[Math.floor(Math.random() * types.length)];
  const subtype = subtypes[type][Math.floor(Math.random() * subtypes[type].length)];

  const now = new Date();
  return {
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
}
