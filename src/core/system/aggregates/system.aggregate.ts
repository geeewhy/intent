import { BaseAggregate } from '../../base/aggregate';
import { BusinessRuleViolation } from '../../errors';
import { SystemCommand, SystemCommandType, SystemEvent, SystemEventType } from '../contracts';
import { buildEvent } from '../../utils/event-factory';

export interface SystemAggregateSnapshotState {
  id: string;
  version: number;
  numberExecutedTests: number;
}

export class SystemAggregate extends BaseAggregate<SystemAggregateSnapshotState> {
  aggregateType = 'system';
  id: string;
  version = 0;
  numberExecutedTests = 0;
  static CURRENT_SCHEMA_VERSION = 1;

  constructor(id: string) {
    super(id);
    this.id = id;
  }

  static create(command: SystemCommand): SystemAggregate {
    const systemId = command.payload?.systemId || 'system';
    const aggregate = new SystemAggregate(systemId);
    return aggregate;
  }

  static rehydrate(events: SystemEvent[]): SystemAggregate {
    if (!events.length) {
      throw new Error('Cannot rehydrate from empty events');
    }

    const aggregate = new SystemAggregate(events[0].aggregateId);

    for (const event of events) {
      aggregate.apply(event);
    }

    return aggregate;
  }

  handle(command: SystemCommand): SystemEvent[] {
    const tenantId = command.tenant_id;

    switch (command.type) {
      case SystemCommandType.LOG_MESSAGE:
        return [buildEvent(
          tenantId,
          this.id,
          SystemEventType.MESSAGE_LOGGED,
          this.version + 1,
          {
            ...command.payload,
            systemId: this.id
          },
          command.metadata
        ) as SystemEvent];

      case SystemCommandType.SIMULATE_FAILURE:
        throw new Error('Simulated failure');

      case SystemCommandType.EMIT_MULTIPLE_EVENTS:
        return Array.from({ length: command.payload.count }, (_, i) => 
          buildEvent(
            tenantId,
            this.id,
            SystemEventType.MULTI_EVENT_EMITTED,
            this.version + i + 1,
            { 
              index: i,
              systemId: this.id
            },
            command.metadata
          ) as SystemEvent
        );

      case SystemCommandType.EXECUTE_TEST:
        return [buildEvent(
          tenantId,
          this.id,
          SystemEventType.TEST_EXECUTED,
          this.version + 1,
          {
            testId: command.payload.testId,
            testName: command.payload.testName,
            result: 'success' as const,
            executedAt: new Date(),
            numberExecutedTests: this.numberExecutedTests + 1,
            parameters: command.payload.parameters,
            systemId: this.id
          },
          command.metadata
        ) as SystemEvent];

      case SystemCommandType.EXECUTE_RETRYABLE_TEST:
        if (this.version % 2 === 0) {
          throw new BusinessRuleViolation('Retryable error', undefined, true);
        }
        return [buildEvent(
          tenantId,
          this.id,
          SystemEventType.RETRYABLE_TEST_EXECUTED,
          this.version + 1,
          {
            testId: command.payload.testId,
            testName: command.payload.testName,
            result: 'success' as const,
            executedAt: new Date(),
            parameters: command.payload.parameters,
            systemId: this.id
          },
          command.metadata
        ) as SystemEvent];

      default:
        return [];
    }
  }

  apply(event: SystemEvent, isNew = false): void {
    switch (event.type) {
      case SystemEventType.TEST_EXECUTED:
        this.numberExecutedTests++;
        break;
    }

    this.version++;
  }

  protected upcastSnapshotState(raw: any, version: number): SystemAggregateSnapshotState {
    return raw;
  }

  protected applyUpcastedSnapshot(state: SystemAggregateSnapshotState): void {
    this.id = state.id;
    this.version = state.version;
    this.numberExecutedTests = state.numberExecutedTests;
  }

  extractSnapshotState(): SystemAggregateSnapshotState {
    return {
      id: this.id,
      version: this.version,
      numberExecutedTests: this.numberExecutedTests,
    };
  }

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }
}
