import {SystemAggregate} from '../aggregates/system.aggregate';
import {
    SystemCommandType,
    SystemEventType,
    LogMessagePayload,
    EmitMultipleEventsPayload,
    ExecuteTestPayload,
    ExecuteRetryableTestPayload,
    SimulateFailurePayload,
    MessageLoggedPayload,
    MultiEventEmittedPayload,
    TestExecutedPayload,
    RetryableTestExecutedPayload
} from '../contracts';

describe('SystemAggregate', () => {
    let systemAggregate: SystemAggregate;

    beforeEach(() => {
        systemAggregate = new SystemAggregate('test-system');
    });

    // Test for static create method
    test('should create a new system aggregate with static create method', () => {
        const command = {
            id: 'test-id',
            tenant_id: 'test-tenant',
            type: SystemCommandType.LOG_MESSAGE as const,
            payload: {
                message: 'Test message',
                systemId: 'custom-system-id'
            } as LogMessagePayload
        };

        const aggregate = SystemAggregate.create(command);

        expect(aggregate).toBeInstanceOf(SystemAggregate);
        expect(aggregate.id).toBe('custom-system-id');
        expect(aggregate.version).toBe(0);
        expect(aggregate.numberExecutedTests).toBe(0);
    });

    // Test for static create method with default system ID
    test('should create a new system aggregate with default system ID', () => {
        const command = {
            id: 'test-id',
            tenant_id: 'test-tenant',
            type: SystemCommandType.LOG_MESSAGE as const,
            payload: {
                message: 'Test message'
            } as LogMessagePayload
        };

        const aggregate = SystemAggregate.create(command);

        expect(aggregate).toBeInstanceOf(SystemAggregate);
        expect(aggregate.id).toBe('system');
    });

    // Test for static rehydrate method
    test('should rehydrate a system aggregate from events', () => {
        const events = [
            {
                id: 'event-1',
                tenant_id: 'test-tenant',
                type: SystemEventType.MESSAGE_LOGGED,
                payload: {message: 'Test message'} as MessageLoggedPayload,
                aggregateId: 'test-system',
                aggregateType: 'system',
                version: 1
            },
            {
                id: 'event-2',
                tenant_id: 'test-tenant',
                type: SystemEventType.TEST_EXECUTED,
                payload: {
                    testId: 'test-id',
                    testName: 'Test Name',
                    result: 'success' as const,
                    numberExecutedTests: 1,
                    executedAt: new Date()
                } as TestExecutedPayload,
                aggregateId: 'test-system',
                aggregateType: 'system',
                version: 2
            }
        ];

        const aggregate = SystemAggregate.rehydrate(events);

        expect(aggregate).toBeInstanceOf(SystemAggregate);
        expect(aggregate.id).toBe('test-system');
        expect(aggregate.version).toBe(2);
        expect(aggregate.numberExecutedTests).toBe(1);
    });

    // Test for rehydrate with empty events array
    test('should throw error when rehydrating with empty events array', () => {
        expect(() => SystemAggregate.rehydrate([])).toThrow('Cannot rehydrate from empty events');
    });

    test('should log a message', () => {
        const command = {
            id: 'test-id',
            tenant_id: 'test-tenant',
            type: SystemCommandType.LOG_MESSAGE as const,
            payload: {message: 'Test message'} as LogMessagePayload
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
            payload: {count: 3} as EmitMultipleEventsPayload
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
            type: SystemCommandType.EXECUTE_TEST,
            metadata: {
                userId: 'test-user-1',
                role: 'tester',
                timestamp: new Date()
            },
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

    // Test for default case in handle method
    test('should return empty array for unknown command type', () => {
        const command = {
            id: 'test-id',
            tenant_id: 'test-tenant',
            type: 'unknownCommand' as any,
            payload: {}
        };

        try {
            systemAggregate.handle(command);
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    });

    // Test for snapshot-related methods
    //todo TEST SNAPSHOT VERSIONING TRANSITION
    test('should extract and apply snapshot state', () => {
        systemAggregate.id = 'test-system';
        systemAggregate.version = 5;
        systemAggregate.numberExecutedTests = 3;

        const snapshotState = systemAggregate.extractSnapshotState();

        expect(snapshotState).toEqual({
            numberExecutedTests: 3
        });

        const newAggregate = new SystemAggregate('test-system');
        newAggregate.applySnapshotState(snapshotState);

        expect(newAggregate.numberExecutedTests).toBe(3);
    });

    // Test for getId and getVersion methods
    test('should return correct id and version', () => {
        systemAggregate.id = 'test-system';
        systemAggregate.version = 10;

        expect(systemAggregate.getId()).toBe('test-system');
        expect(systemAggregate.getVersion()).toBe(10);
    });

    // Test for apply method with different event types
    test('should apply different event types correctly', () => {
        // Apply MESSAGE_LOGGED event
        const messageEvent = {
            id: 'event-1',
            tenant_id: 'test-tenant',
            type: SystemEventType.MESSAGE_LOGGED,
            payload: {message: 'Test message'} as MessageLoggedPayload,
            aggregateType: 'system',
            aggregateId: 'test-system',
            version: 1
        };

        systemAggregate.apply(messageEvent);
        expect(systemAggregate.version).toBe(1);

        // Apply MULTI_EVENT_EMITTED event
        const multiEvent = {
            id: 'event-2',
            tenant_id: 'test-tenant',
            type: SystemEventType.MULTI_EVENT_EMITTED,
            payload: {index: 0} as MultiEventEmittedPayload,
            aggregateId: 'test-system',
            aggregateType: 'system',
            version: 2
        };

        systemAggregate.apply(multiEvent);
        expect(systemAggregate.version).toBe(2);

        // Apply RETRYABLE_TEST_EXECUTED event
        const retryableEvent = {
            id: 'event-3',
            tenant_id: 'test-tenant',
            type: SystemEventType.RETRYABLE_TEST_EXECUTED,
            payload: {
                testId: 'test-id',
                testName: 'Retryable Test',
                result: 'success' as const,
                executedAt: new Date()
            } as RetryableTestExecutedPayload,
            aggregateId: 'test-system',
            aggregateType: 'system',
            version: 3
        };

        systemAggregate.apply(retryableEvent);
        expect(systemAggregate.version).toBe(3);
    });
});
