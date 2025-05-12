import { systemSaga } from '../sagas/system.saga';
import { SystemCommandType, SystemEventType } from '../contracts';

describe('SystemSaga', () => {
  test('should trigger log message command when multi event index is 2', () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MULTI_EVENT_EMITTED,
      payload: { index: 2 },
      aggregateId: 'system-id',
      version: 1
    };

    const commands = systemSaga(event);

    expect(commands).toHaveLength(1);
    expect(commands[0].type).toBe(SystemCommandType.LOG_MESSAGE);
    expect(commands[0].payload.message).toBe('auto-triggered from saga');
  });

  test('should not trigger commands for other events', () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MESSAGE_LOGGED,
      payload: { message: 'Test message' },
      aggregateId: 'system-id',
      version: 1
    };

    const commands = systemSaga(event);

    expect(commands).toHaveLength(0);
  });

  test('should not trigger commands for multi event with index other than 2', () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MULTI_EVENT_EMITTED,
      payload: { index: 1 },
      aggregateId: 'system-id',
      version: 1
    };

    const commands = systemSaga(event);

    expect(commands).toHaveLength(0);
  });
});