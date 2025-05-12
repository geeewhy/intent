import { SystemAggregate } from '../aggregates/system.aggregate';
import { SystemCommandType, SystemEventType, LogMessagePayload, EmitMultipleEventsPayload, ExecuteTestPayload, ExecuteRetryableTestPayload, SimulateFailurePayload } from '../contracts';

describe('SystemAggregate', () => {
  let systemAggregate: SystemAggregate;

  beforeEach(() => {
    systemAggregate = new SystemAggregate('test-system');
  });

  test('should log a message', () => {
    const command = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      type: SystemCommandType.LOG_MESSAGE as const,
      payload: { message: 'Test message' } as LogMessagePayload
    };

    const events = systemAggregate.handle(command);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SystemEventType.MESSAGE_LOGGED);
    expect(events[0].payload.message).toBe('Test message');
  });

  test('should emit multiple events', () => {
    const command = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      type: SystemCommandType.EMIT_MULTIPLE_EVENTS as const,
      payload: { count: 3 } as EmitMultipleEventsPayload
    };

    const events = systemAggregate.handle(command);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe(SystemEventType.MULTI_EVENT_EMITTED);
    expect(events[0].payload.index).toBe(0);
    expect(events[1].payload.index).toBe(1);
    expect(events[2].payload.index).toBe(2);
  });

  test('should execute a test and increment numberExecutedTests', () => {
    const command = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      type: SystemCommandType.EXECUTE_TEST as const,
      payload: { 
        testId: 'test-id', 
        testName: 'Test Name' 
      } as ExecuteTestPayload
    };

    const events = systemAggregate.handle(command);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SystemEventType.TEST_EXECUTED);
    expect(events[0].payload.testId).toBe('test-id');
    expect(events[0].payload.testName).toBe('Test Name');
    expect(events[0].payload.result).toBe('success');
    expect(events[0].payload.numberExecutedTests).toBe(1);

    systemAggregate.apply(events[0]);
    expect(systemAggregate.numberExecutedTests).toBe(1);
  });

  test('should throw error on even versions for retryable test', () => {
    const command = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      type: SystemCommandType.EXECUTE_RETRYABLE_TEST as const,
      payload: { 
        testId: 'test-id', 
        testName: 'Retryable Test' 
      } as ExecuteRetryableTestPayload
    };

    // First attempt (version 0) should throw
    expect(() => systemAggregate.handle(command)).toThrow('Retryable error');

    // Increment version to simulate retry
    systemAggregate.version = 1;

    // Second attempt (version 1) should succeed
    const events = systemAggregate.handle(command);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SystemEventType.RETRYABLE_TEST_EXECUTED);
  });

  test('should throw error on simulate failure', () => {
    const command = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      type: SystemCommandType.SIMULATE_FAILURE as const,
      payload: {} as SimulateFailurePayload
    };

    expect(() => systemAggregate.handle(command)).toThrow('Simulated failure');
  });
});
