//devex-ui/src/data/mockCommands.ts

import type { Command } from './types';

export const mockCommands: Command[] = [
  {
    id: 'cmd-001',
    tenant_id: 'tenant-1',
    type: 'CreateUser',
    payload: { email: 'user@example.com', name: 'John Doe', role: 'user' },
    status: 'processed',
    metadata: {
      userId: 'admin-1',
      role: 'admin',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      correlationId: 'corr-001',
      requestId: 'req-001',
      source: 'web-api',
      tags: { environment: 'production' },
      schemaVersion: 1
    }
  },
  {
    id: 'cmd-002',
    tenant_id: 'tenant-1',
    type: 'PlaceOrder',
    payload: { userId: 'user-123', items: [{ productId: 'prod-1', quantity: 2 }] },
    status: 'processed',
    metadata: {
      userId: 'user-123',
      role: 'user',
      timestamp: new Date('2024-01-15T10:29:00Z'),
      correlationId: 'corr-002',
      requestId: 'req-002',
      source: 'mobile-app',
      tags: { channel: 'mobile' },
      schemaVersion: 1
    }
  },
  {
    id: 'cmd-003',
    tenant_id: 'tenant-2',
    type: 'ProcessPayment',
    payload: { orderId: 'order-456', amount: 29.99, method: 'credit_card' },
    status: 'pending',
    metadata: {
      userId: 'system',
      role: 'system',
      timestamp: new Date('2024-01-15T10:28:00Z'),
      correlationId: 'corr-003',
      causationId: 'cmd-002',
      requestId: 'req-003',
      source: 'payment-service',
      tags: { processor: 'stripe' },
      schemaVersion: 1
    }
  }
];

export const recentCommands = [
  {
    id: '1',
    type: 'logMessage',
    aggregateId: 'system-123',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'success',
    payload: { message: "System started successfully", systemId: "sys-001" },
    response: { success: true, messageId: "msg-456" }
  },
  {
    id: '2',
    type: 'executeTest',
    aggregateId: 'test-456',
    timestamp: '2024-01-15T10:25:00Z',
    status: 'success',
    payload: { testId: "test-001", testName: "Integration Test", parameters: { timeout: 5000 } },
    response: { success: true, testResult: "passed", duration: 2340 }
  },
  {
    id: '3',
    type: 'simulateFailure',
    aggregateId: 'system-789',
    timestamp: '2024-01-15T10:20:00Z',
    status: 'failed',
    payload: { systemId: "sys-002" },
    response: { success: false, error: "Simulation failed: Network timeout" }
  }
];

// Fake fetch function for commands
export const fetchCommands = async (tenantId: string, limit = 50): Promise<Command[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return mockCommands
    .filter(command => command.tenant_id === tenantId)
    .slice(0, limit);
};

// Fake submit command function
export const submitCommand = async (command: Omit<Command, 'id' | 'status'>): Promise<{ success: boolean; commandId: string; message?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
  
  const commandId = `cmd-${Date.now()}`;
  const success = Math.random() > 0.1; // 90% success rate
  
  if (success) {
    return { success: true, commandId, message: 'Command submitted successfully' };
  } else {
    return { success: false, commandId, message: 'Command failed to process' };
  }
};

// Fake fetch recent commands
export const fetchRecentCommands = async (limit = 10) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return recentCommands.slice(0, limit);
};
