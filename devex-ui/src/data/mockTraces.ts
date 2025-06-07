//devex-ui/src/data/mockTraces.ts

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

interface TraceEdge {
  from: string;
  to: string;
  type: 'causation' | 'correlation';
}

export const mockTraces: TraceNode[] = [
  // User Creation Flow
  {
    id: "cmd-user-001",
    type: "Command",
    subtype: "CreateUser",
    timestamp: "2024-01-15T10:30:00Z",
    correlationId: "corr-user-123",
    tenantId: "tenant-1",
    level: 0
  },
  {
    id: "evt-user-001",
    type: "Event",
    subtype: "UserCreated",
    timestamp: "2024-01-15T10:30:01Z",
    correlationId: "corr-user-123",
    causationId: "cmd-user-001",
    aggregateId: "user-123",
    tenantId: "tenant-1",
    level: 1
  },
  {
    id: "evt-user-002",
    type: "Event",
    subtype: "WelcomeEmailSent",
    timestamp: "2024-01-15T10:30:02Z",
    correlationId: "corr-user-123",
    causationId: "evt-user-001",
    aggregateId: "email-456",
    tenantId: "tenant-1",
    level: 2
  },
  {
    id: "snap-user-001",
    type: "Snapshot",
    subtype: "UserAggregate",
    timestamp: "2024-01-15T10:30:03Z",
    correlationId: "corr-user-123",
    aggregateId: "user-123",
    tenantId: "tenant-1",
    level: 1
  },
  // Order Placement Flow
  {
    id: "cmd-order-001",
    type: "Command",
    subtype: "PlaceOrder",
    timestamp: "2024-01-15T10:29:00Z",
    correlationId: "corr-order-456",
    tenantId: "tenant-1",
    level: 0
  },
  {
    id: "evt-order-001",
    type: "Event",
    subtype: "OrderPlaced",
    timestamp: "2024-01-15T10:29:01Z",
    correlationId: "corr-order-456",
    causationId: "cmd-order-001",
    aggregateId: "order-456",
    tenantId: "tenant-1",
    level: 1
  },
  {
    id: "evt-order-002",
    type: "Event",
    subtype: "InventoryReserved",
    timestamp: "2024-01-15T10:29:02Z",
    correlationId: "corr-order-456",
    causationId: "evt-order-001",
    aggregateId: "inventory-789",
    tenantId: "tenant-1",
    level: 2
  },
  {
    id: "cmd-payment-001",
    type: "Command",
    subtype: "ProcessPayment",
    timestamp: "2024-01-15T10:29:03Z",
    correlationId: "corr-order-456",
    causationId: "evt-order-002",
    tenantId: "tenant-1",
    level: 3
  },
  {
    id: "evt-payment-001",
    type: "Event",
    subtype: "PaymentProcessed",
    timestamp: "2024-01-15T10:29:04Z",
    correlationId: "corr-order-456",
    causationId: "cmd-payment-001",
    aggregateId: "payment-789",
    tenantId: "tenant-1",
    level: 4
  },
  {
    id: "snap-order-001",
    type: "Snapshot",
    subtype: "OrderAggregate",
    timestamp: "2024-01-15T10:29:05Z",
    correlationId: "corr-order-456",
    aggregateId: "order-456",
    tenantId: "tenant-1",
    level: 1
  },
  // Payment Refund Flow
  {
    id: "cmd-refund-001",
    type: "Command",
    subtype: "ProcessRefund",
    timestamp: "2024-01-15T10:28:00Z",
    correlationId: "corr-refund-789",
    tenantId: "tenant-2",
    level: 0
  },
  {
    id: "evt-refund-001",
    type: "Event",
    subtype: "PaymentRefunded",
    timestamp: "2024-01-15T10:28:01Z",
    correlationId: "corr-refund-789",
    causationId: "cmd-refund-001",
    aggregateId: "payment-789",
    tenantId: "tenant-2",
    level: 1
  }
];

// Fake search function
export const searchTraces = async (query: string): Promise<TraceNode[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const searchTerm = query.toLowerCase();
  return mockTraces.filter(trace => 
    trace.id.toLowerCase().includes(searchTerm) ||
    trace.correlationId.toLowerCase().includes(searchTerm) ||
    trace.causationId?.toLowerCase().includes(searchTerm) ||
    trace.aggregateId?.toLowerCase().includes(searchTerm) ||
    trace.subtype.toLowerCase().includes(searchTerm) ||
    trace.type.toLowerCase().includes(searchTerm)
  );
};

// Fake fetch traces by correlation ID
export const fetchTracesByCorrelation = async (correlationId: string): Promise<{ traces: TraceNode[], edges: TraceEdge[] }> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const traces = mockTraces.filter(trace => trace.correlationId === correlationId);
  
  // Generate edges based on causation relationships
  const edges: TraceEdge[] = [];
  traces.forEach(trace => {
    if (trace.causationId) {
      const parent = traces.find(t => t.id === trace.causationId);
      if (parent) {
        edges.push({
          from: parent.id,
          to: trace.id,
          type: 'causation'
        });
      }
    }
  });

  return { traces, edges };
};

// Fake fetch trace by ID
export const fetchTraceById = async (traceId: string): Promise<TraceNode | null> => {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return mockTraces.find(trace => trace.id === traceId) || null;
};
