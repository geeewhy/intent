import { SystemSaga } from '../sagas/system.saga';
import { SystemCommandType, SystemEventType } from '../contracts';

describe('SystemSaga', () => {
  test('reactsTo should include MULTI_EVENT_EMITTED', () => {
    expect(SystemSaga.reactsTo()).toContain(SystemEventType.MULTI_EVENT_EMITTED);
  });

  test('react should return a plan with commands for MULTI_EVENT_EMITTED with index 2', async () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MULTI_EVENT_EMITTED,
      payload: { index: 2 },
      aggregateId: 'system-id',
      version: 1
    };

    const ctx = {
      nextId: jest.fn().mockResolvedValue('new-id'),
      correlationId: 'correlation-id',
      emitInternalSignal: jest.fn()
    };

    const plan = await SystemSaga.react(event, ctx);

    expect(plan.commands).toHaveLength(1);
    expect(plan.commands[0].type).toBe(SystemCommandType.LOG_MESSAGE);
    expect(plan.commands[0].payload.message).toBe('auto-trigger immediate from saga');
    expect(ctx.emitInternalSignal).toHaveBeenCalledWith('obs.trace', expect.any(Object));
  });

  test('react should not return commands for other events', async () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MESSAGE_LOGGED,
      payload: { message: 'Test message' },
      aggregateId: 'system-id',
      version: 1
    };

    const ctx = {
      nextId: jest.fn().mockResolvedValue('new-id'),
      correlationId: 'correlation-id',
      emitInternalSignal: jest.fn()
    };

    const plan = await SystemSaga.react(event, ctx);

    expect(plan.commands).toHaveLength(0);
  });

  test('react should not return commands for MULTI_EVENT_EMITTED with index other than 2', async () => {
    const event = {
      id: 'event-id',
      tenant_id: 'tenant-id',
      type: SystemEventType.MULTI_EVENT_EMITTED,
      payload: { index: 1 },
      aggregateId: 'system-id',
      version: 1
    };

    const ctx = {
      nextId: jest.fn().mockResolvedValue('new-id'),
      correlationId: 'correlation-id',
      emitInternalSignal: jest.fn()
    };

    const plan = await SystemSaga.react(event, ctx);

    expect(plan.commands).toHaveLength(0);
  });
});
