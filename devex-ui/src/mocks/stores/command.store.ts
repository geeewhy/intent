import { createStore } from './createStore';
import { makeCommand } from '../factories/command.factory';
import type { Command } from '@/data/types';

export const commandStore = createStore<Command>(1000);
commandStore.seed(() => makeCommand(), 200);

// Recent commands store for the recent commands endpoint
export const recentCommandsStore = createStore<Command>(50);

// Seed recent commands with some predefined data
recentCommandsStore.push({
  id: '1',
  type: 'logMessage',
  tenant_id: 'tenant-1',
  aggregateId: 'system-123',
  createdAt: '2024-01-15T10:30:00Z',
  status: 'processed',
  payload: { message: "System started successfully", systemId: "sys-001" },
  response: { success: true, messageId: "msg-456" }
} as Command);

recentCommandsStore.push({
  id: '2',
  type: 'executeTest',
  tenant_id: 'tenant-1',
  aggregateId: 'test-456',
  createdAt: '2024-01-15T10:25:00Z',
  status: 'processed',
  payload: { testId: "test-001", testName: "Integration Test", parameters: { timeout: 5000 } },
  response: { success: true, testResult: "passed", duration: 2340 }
} as Command);

recentCommandsStore.push({
  id: '3',
  type: 'simulateFailure',
  tenant_id: 'tenant-2',
  aggregateId: 'system-789',
  createdAt: '2024-01-15T10:20:00Z',
  status: 'failed',
  payload: { systemId: "sys-002" },
  response: { success: false, error: "Simulation failed: Network timeout" }
} as Command);