// devex-ui/src/mocks/factories/trace.factory.ts
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
  level: number;
}

const MIN_LEVELS = 2;
const MAX_LEVELS = 5;
const MIN_EVENTS = 1;
const MAX_EVENTS = 2;
const SNAPSHOT_PROB = 0.5;
const MAX_PER_LEVEL = 3;

const SUBTYPES = {
  Event: [
    'UserCreated', 'OrderPlaced', 'PaymentProcessed', 'UserUpdated',
    'ProductCreated', 'OrderCancelled', 'PaymentRefunded',
    'InventoryReserved', 'WelcomeEmailSent',
  ],
  Command: [
    'CreateUser', 'PlaceOrder', 'ProcessPayment', 'UpdateUser',
    'CreateProduct', 'CancelOrder', 'ProcessRefund', 'UpdateInventory',
  ],
  Snapshot: [
    'UserAggregate', 'OrderAggregate', 'PaymentAggregate',
    'ProductAggregate', 'InventoryAggregate',
  ],
} as const;

const rnd = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const between = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));

const makeNode = (
    type: TraceNode['type'],
    level: number,
    correlationId: string,
    causationId?: string,
): TraceNode => ({
  id: `${type.toLowerCase()}-${uuid().slice(0, 8)}`,
  type,
  subtype: rnd(SUBTYPES[type]),
  timestamp: new Date().toISOString(),
  correlationId,
  causationId,
  aggregateId: Math.random() > 0.2 ? `agg-${uuid().slice(0, 8)}` : undefined,
  tenantId: Math.random() > 0.5 ? 'tenant-1' : 'tenant-2',
  level,
});

/* internal queue –  makeTrace() pops from here */
let queue: TraceNode[] = [];

const buildCluster = () => {
  const correlationId = `corr-${uuid().slice(0, 8)}`;
  const depth = between(MIN_LEVELS, MAX_LEVELS);

  const nodes: TraceNode[] = [];

  const root = makeNode('Command', 0, correlationId);
  nodes.push(root);

  let parents: TraceNode[] = [root];

  for (let lvl = 1; lvl < depth; lvl++) {
    const parent = rnd(parents);
    const causationId = parent.id;

    const evCount = between(MIN_EVENTS, MAX_EVENTS);
    const events: TraceNode[] = Array.from({ length: evCount }).map(() =>
        makeNode('Event', lvl, correlationId, causationId),
    );
    nodes.push(...events);

    if (
        events.length < MAX_PER_LEVEL &&
        Math.random() < SNAPSHOT_PROB
    ) {
      nodes.push(makeNode('Snapshot', lvl, correlationId, causationId));
    }

    parents = events;
  }

  queue = nodes;          // replace queue with fresh cluster
};

/* public – seeded by loadDefault() */
export function makeTrace(overrides: Partial<TraceNode> = {}): TraceNode {
  if (!queue.length) buildCluster();
  const base = queue.shift()!;
  return { ...base, ...overrides };
}
