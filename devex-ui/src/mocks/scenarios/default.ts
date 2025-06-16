//devex-ui/src/mocks/scenarios/default.ts
//src/devex-ui/src/mocks/scenarios/default.ts
import {
  eventStore,
  commandStore,
  recentCommandsStore,
  traceStore,
  logStore,
  rolesStore
} from '@/mocks/stores';

import { makeEvent } from '../factories/event.factory';
import { makeCommand } from '../factories/command.factory';
import { makeTrace } from '../factories/trace.factory';
import { makeLog } from '../factories/log.factory';
import { makeCommandRegistry } from '../factories/registry.factory';
import type { Command } from '@/data/types';

export const mockCommandRegistry = makeCommandRegistry();

// preserves current demo dataset
export function loadDefault() {
  // Optional: reset first
  eventStore.reset();
  commandStore.reset();
  recentCommandsStore.reset();
  traceStore.reset();
  logStore.reset();
  rolesStore.reset();

  // Get seed size from ENV var or use default
  const SEED_SIZE = Number(import.meta.env.VITE_SEED_SIZE ?? 200);
  const LOG_SEED_SIZE = Math.floor(SEED_SIZE * 1.25); // Logs are typically more numerous

  // Seed with random data
  eventStore.seed(() => makeEvent(), 10 + Math.floor((Math.random() - 0.5) * 10));
  commandStore.seed(() => makeCommand(), SEED_SIZE + Math.floor((Math.random() - 0.5) * 100));
  traceStore.seed(() => makeTrace(), SEED_SIZE + Math.floor((Math.random() - 0.5) * 100));
  logStore.seed(() => makeLog(), LOG_SEED_SIZE + Math.floor((Math.random() - 0.5) * 100));

  // Seed recent commands with specific data
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

  // Seed roles store with domain-specific roles
  rolesStore.push({
    id: 'system',
    domain: 'system',
    roles: ['tester', 'system', 'developer']
  });

  rolesStore.push({
    id: 'user',
    domain: 'user',
    roles: ['admin', 'viewer']
  });

  rolesStore.push({
    id: 'order',
    domain: 'order',
    roles: ['sales', 'ops']
  });

  rolesStore.push({
    id: 'payment',
    domain: 'payment',
    roles: ['billing', 'auditor']
  });

  rolesStore.push({
    id: 'catalog',
    domain: 'catalog',
    roles: ['manager', 'editor']
  });

  rolesStore.push({
    id: 'inventory',
    domain: 'inventory',
    roles: ['stock', 'restocker']
  });

}
