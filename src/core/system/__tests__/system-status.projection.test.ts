import { createSystemStatusProjection } from '../read-models/system-status.projection';
import { createMockUpdater } from '../../shared/test-utils';
import { SystemEventType } from '../contracts';

describe('System Status Projection', () => {
  test('creates a status row for TEST_EXECUTED', async () => {
    const mock = createMockUpdater();
    const handler = createSystemStatusProjection(mock);
    const event = {
      id: 'event-123',
      type: SystemEventType.TEST_EXECUTED,
      tenant_id: 'tenant-1',
      aggregateId: 'system-123',
      aggregateType: 'system',
      version: 1,
      payload: {
        testId: 'test-1',
        systemId: 'system-123',
        testName: 'health-check',
        result: 'success',
        executedAt: new Date(),
        numberExecutedTests: 1,
        parameters: { run: true }
      },
      metadata: { timestamp: new Date() }
    };

    expect(handler.supportsEvent(event)).toBe(true);
    await handler.handle(event);

    expect(mock.store.get('system-123')).toMatchObject({
      testName: 'health-check',
      result: 'success',
      tenant_id: 'tenant-1',
      numberExecutedTests: 1
    });
  });

  test('does not support other event types', async () => {
    const mock = createMockUpdater();
    const handler = createSystemStatusProjection(mock);
    const event = {
      id: 'event-456',
      type: SystemEventType.MESSAGE_LOGGED,
      tenant_id: 'tenant-1',
      aggregateId: 'system-123',
      aggregateType: 'system',
      version: 1,
      payload: {
        message: 'Test message',
        systemId: 'system-123'
      },
      metadata: { timestamp: new Date() }
    };

    expect(handler.supportsEvent(event)).toBe(false);
  });
});
