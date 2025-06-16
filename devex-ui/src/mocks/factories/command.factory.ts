//devex-ui/src/mocks/factories/command.factory.ts
import { v4 as uuid } from 'uuid';
import type { Command, Metadata } from '@/data/types';

export function makeCommand(overrides?: Partial<Command>): Command {
  const commandTypes = ['CreateUser', 'PlaceOrder', 'ProcessPayment', 'UpdateUser', 'CreateProduct', 'CancelOrder', 'ProcessRefund', 'UpdateProduct', 'UpdateInventory'];
  const sources = ['web-api', 'mobile-app', 'payment-service', 'inventory-service', 'notification-service'];
  const statuses = ['pending', 'consumed', 'processed', 'failed'];

  const defaultMetadata: Metadata = {
    userId: `user-${uuid().substring(0, 8)}`,
    role: Math.random() > 0.7 ? 'admin' : 'user',
    timestamp: new Date().toISOString(),
    correlationId: `corr-${uuid().substring(0, 8)}`,
    requestId: `req-${uuid().substring(0, 8)}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    tags: { environment: 'production', channel: Math.random() > 0.5 ? 'web' : 'mobile' },
    schemaVersion: 1
  };

  const now = new Date();
  const defaultCommand: Command = {
    id: `cmd-${uuid()}`,
    tenant_id: Math.random() > 0.5 ? 'tenant-1' : 'tenant-2',
    type: commandTypes[Math.floor(Math.random() * commandTypes.length)],
    payload: { 
      randomData: Math.random(), 
      timestamp: now.toISOString(),
      value: Math.floor(Math.random() * 1000)
    },
    status: statuses[Math.floor(Math.random() * statuses.length)],
    metadata: defaultMetadata,
    createdAt: now.toISOString()
  };

  return { ...defaultCommand, ...overrides };
}
