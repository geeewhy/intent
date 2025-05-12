// src/core/system/aggregates/system.aggregate.ts

import {Command, Event} from '../../contracts';
import {BaseAggregate} from '../../base/aggregate';
import {BusinessRuleViolation} from '../../errors';
import {
    UUID,
    SystemCommandType,
    SystemEventType,
    LogMessagePayload,
    SimulateFailurePayload,
    EmitMultipleEventsPayload,
    ExecuteTestPayload,
    ExecuteRetryableTestPayload,
    MessageLoggedPayload,
    FailureSimulatedPayload,
    MultiEventEmittedPayload,
    TestExecutedPayload,
    RetryableTestExecutedPayload
} from '../contracts';
import {buildEvent} from '../../utils/event-factory';

type SystemSnapshotState = {
    numberExecutedTests: number;
};

export class SystemAggregate extends BaseAggregate<SystemSnapshotState> {
    public aggregateType = 'system';
    static CURRENT_SCHEMA_VERSION = 1;

    id: UUID;
    version = 0;
    numberExecutedTests = 0;

    constructor(id: UUID) {
        super(id);
        this.id = id;
    }

    static create(cmd: Command<LogMessagePayload | EmitMultipleEventsPayload | ExecuteTestPayload>): SystemAggregate {
        return new SystemAggregate(cmd.payload.systemId || 'system');
    }

    static rehydrate(events: Event[]): SystemAggregate {
        if (!events.length) {
            throw new Error('Cannot rehydrate from empty events');
        }

        const base = new SystemAggregate(events[0].aggregateId);

        events.forEach(event => base.apply(event, false));
        return base;
    }

    private readonly handlers: Record<SystemCommandType, (cmd: Command) => Event[]> = {
        [SystemCommandType.LOG_MESSAGE]: this.handleLogMessage.bind(this),
        [SystemCommandType.SIMULATE_FAILURE]: this.handleSimulateFailure.bind(this),
        [SystemCommandType.EMIT_MULTIPLE_EVENTS]: this.handleEmitMultipleEvents.bind(this),
        [SystemCommandType.EXECUTE_TEST]: this.handleExecuteTest.bind(this),
        [SystemCommandType.EXECUTE_RETRYABLE_TEST]: this.handleExecuteRetryableTest.bind(this),
    };

    public handle(cmd: Command): Event[] {
        const handler = this.handlers[cmd.type as SystemCommandType];
        if (!handler) throw new Error(`Unknown command type: ${cmd.type}`);
        return handler(cmd);
    }

    public apply(event: Event, isNew = true): void {
        switch (event.type) {
            case SystemEventType.MESSAGE_LOGGED:
                this.applyMessageLogged(event as Event<MessageLoggedPayload>);
                break;
            case SystemEventType.FAILURE_SIMULATED:
                this.applyFailureSimulated(event as Event<FailureSimulatedPayload>);
                break;
            case SystemEventType.MULTI_EVENT_EMITTED:
                this.applyMultiEventEmitted(event as Event<MultiEventEmittedPayload>);
                break;
            case SystemEventType.TEST_EXECUTED:
                this.applyTestExecuted(event as Event<TestExecutedPayload>);
                break;
            case SystemEventType.RETRYABLE_TEST_EXECUTED:
                this.applyRetryableTestExecuted(event as Event<RetryableTestExecutedPayload>);
                break;
            default:
                throw new Error(`Unknown event type: ${event.type}`);
        }

        if (isNew) {
            this.version++;
        } else {
            this.version = event.version;
        }
    }

    private handleLogMessage(cmd: Command<LogMessagePayload>): Event[] {
        const payload = {...cmd.payload, systemId: this.id};
        const event = buildEvent<LogMessagePayload>(
            cmd.tenant_id,
            this.id,
            SystemEventType.MESSAGE_LOGGED,
            this.version,
            payload,
            {
                userId: cmd.metadata?.userId,
                correlationId: cmd.metadata?.correlationId,
                causationId: cmd.id,
            }
        );
        this.apply(event);
        return [event];
    }

    private handleSimulateFailure(_: Command<SimulateFailurePayload>): Event[] {
        throw new BusinessRuleViolation('Simulated failure', undefined, true);
    }

    private handleEmitMultipleEvents(cmd: Command<EmitMultipleEventsPayload>): Event[] {
        const now = new Date();
        const events: Event[] = [];

        for (let i = 0; i < cmd.payload.count; i++) {
            const payload: MultiEventEmittedPayload = {
                index: i,
                systemId: this.id,
            };
            const event = buildEvent<MultiEventEmittedPayload>(
                cmd.tenant_id,
                this.id,
                SystemEventType.MULTI_EVENT_EMITTED,
                this.version + i,
                payload,
                {
                    userId: cmd.metadata?.userId,
                    correlationId: cmd.metadata?.correlationId,
                    causationId: cmd.id,
                }
            );
            this.apply(event);
            events.push(event);
        }

        return events;
    }

    private handleExecuteTest(cmd: Command<ExecuteTestPayload>): Event[] {
        const now = new Date();
        const payload: TestExecutedPayload = {
            testId: cmd.payload.testId,
            testName: cmd.payload.testName,
            result: 'success',
            executedAt: now,
            numberExecutedTests: this.numberExecutedTests + 1,
            parameters: cmd.payload.parameters,
            systemId: this.id,
        };
        const event = buildEvent<TestExecutedPayload>(
            cmd.tenant_id,
            this.id,
            SystemEventType.TEST_EXECUTED,
            this.version,
            payload,
            {
                userId: cmd.metadata?.userId,
                correlationId: cmd.metadata?.correlationId,
                causationId: cmd.id,
            }
        );
        this.apply(event);
        return [event];
    }

    private handleExecuteRetryableTest(cmd: Command<ExecuteRetryableTestPayload>): Event[] {
        if (this.version % 2 === 0) {
            throw new BusinessRuleViolation('Retryable error', undefined, true);
        }

        const now = new Date();
        const payload: RetryableTestExecutedPayload = {
            testId: cmd.payload.testId,
            testName: cmd.payload.testName,
            result: 'success',
            executedAt: now,
            parameters: cmd.payload.parameters,
            systemId: this.id,
        };
        const event = buildEvent<RetryableTestExecutedPayload>(
            cmd.tenant_id,
            this.id,
            SystemEventType.RETRYABLE_TEST_EXECUTED,
            this.version,
            payload,
            {
                userId: cmd.metadata?.userId,
                correlationId: cmd.metadata?.correlationId,
                causationId: cmd.id,
            }
        );
        this.apply(event);
        return [event];
    }

    private applyMessageLogged(_: Event<MessageLoggedPayload>): void {
        // no-op
    }

    private applyFailureSimulated(_: Event<FailureSimulatedPayload>): void {
        // no-op
    }

    private applyMultiEventEmitted(_: Event<MultiEventEmittedPayload>): void {
        // no-op
    }

    private applyTestExecuted(_: Event<TestExecutedPayload>): void {
        this.numberExecutedTests++;
    }

    private applyRetryableTestExecuted(_: Event<RetryableTestExecutedPayload>): void {
        // no-op
    }

    protected upcastSnapshotState(raw: any, version: number): SystemSnapshotState {
        return raw;
    }

    protected applyUpcastedSnapshot(state: SystemSnapshotState): void {
        this.numberExecutedTests = state.numberExecutedTests;
    }

    extractSnapshotState(): SystemSnapshotState {
        return {
            numberExecutedTests: this.numberExecutedTests,
        };
    }

    public getId(): UUID {
        return this.id;
    }

    public getVersion(): number {
        return this.version;
    }
}
