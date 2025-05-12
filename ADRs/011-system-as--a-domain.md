# `SystemAggregate`: Infrastructure-Safe Internal Testing Domain

Summary:

> A pure infra domain to simulate all system behaviors: retries, event emission, version tracking, and logical assertions. No projections. All actions live within Temporal workflows.

New `SystemAggregate` will:

* Capable of driving **stateful retry testing**
* Validating **multi-event emission**
* Acting as a **proxy for snapshot & projection tests**
* Completely decoupled from `order` domain
* Running inside your **real infrastructure** (event store, workflow, versioning)

---

## Purpose

Establish a clean internal domain that lets:

* Simulate command → event pipelines
* Trigger failures for Temporal retry testing
* Emit multi-event chains for replay and fan-out validation
* Drive end-to-end system behavior using real infrastructure (eventStore, workflows, sagas)

---

## Directory Structure

```
/core/system/
  index.ts
  contracts.ts
  access.ts
  aggregates/
    system.aggregate.ts
  sagas/
    system.saga.ts
```

## 1 `contracts.ts`

```ts
export type UUID = string;

export enum SystemCommandType {
  LOG_MESSAGE = 'logMessage',
  SIMULATE_FAILURE = 'simulateFailure',
  EMIT_MULTIPLE_EVENTS = 'emitMultipleEvents',
  EXECUTE_TEST = 'executeTest',
  EXECUTE_RETRYABLE_TEST = 'executeRetryableTest',
}

export enum SystemEventType {
  MESSAGE_LOGGED = 'messageLogged',
  FAILURE_SIMULATED = 'failureSimulated',
  MULTI_EVENT_EMITTED = 'multiEventEmitted',
  TEST_EXECUTED = 'testExecuted',
  RETRYABLE_TEST_EXECUTED = 'retryableTestExecuted',
}

export interface LogMessagePayload {
  message: string;
}

export interface EmitMultipleEventsPayload {
  count: number;
}

export interface ExecuteTestPayload {
  testId: UUID;
  testName: string;
  parameters?: Record<string, any>;
}

export interface ExecuteRetryableTestPayload {
  testId: UUID;
  testName: string;
  parameters?: Record<string, any>;
}

export type SystemCommand =
  | { type: SystemCommandType.LOG_MESSAGE; payload: LogMessagePayload }
  | { type: SystemCommandType.SIMULATE_FAILURE }
  | { type: SystemCommandType.EMIT_MULTIPLE_EVENTS; payload: EmitMultipleEventsPayload }
  | { type: SystemCommandType.EXECUTE_TEST; payload: ExecuteTestPayload }
  | { type: SystemCommandType.EXECUTE_RETRYABLE_TEST; payload: ExecuteRetryableTestPayload };

export type SystemEvent =
  | { type: SystemEventType.MESSAGE_LOGGED; payload: LogMessagePayload }
  | { type: SystemEventType.FAILURE_SIMULATED }
  | { type: SystemEventType.MULTI_EVENT_EMITTED; payload: { index: number } }
  | { type: SystemEventType.TEST_EXECUTED; payload: {
      testId: UUID;
      testName: string;
      result: 'success';
      numberExecutedTests: number;
      executedAt: Date;
      parameters?: Record<string, any>;
    } }
  | { type: SystemEventType.RETRYABLE_TEST_EXECUTED; payload: {
      testId: UUID;
      testName: string;
      result: 'success';
      executedAt: Date;
      parameters?: Record<string, any>;
    } };
```

---

## 2 `system.aggregate.ts`
* Tracks `version`, `numberExecutedTests`
* Implements deterministic retryable failure
* Emits state-dependent events for snapshot testing

For the structure, check out `OrderAggregate` in `core/order/aggregates/order.aggregate.ts`.

example

```ts

export SystemAggregateSnapshotState ...

export class SystemAggregate extends BaseAggregate<SystemAggregateSnapshotState> {
  id: string;
  version = 0;
  numberExecutedTests = 0;
  static CURRENT_SCHEMA_VERSION = 1;
  constructor(id: string) {
    this.id = id;
  }

  handle(command: SystemCommand): SystemEvent[] {
    switch (command.type) {
      case SystemCommandType.LOG_MESSAGE:
        return [{ type: SystemEventType.MESSAGE_LOGGED, payload: command.payload }];

      case SystemCommandType.SIMULATE_FAILURE:
        throw new Error('Simulated failure');

      case SystemCommandType.EMIT_MULTIPLE_EVENTS:
        return Array.from({ length: command.payload.count }, (_, i) => ({
          type: SystemEventType.MULTI_EVENT_EMITTED,
          payload: { index: i },
        }));

      case SystemCommandType.EXECUTE_TEST:
        return [{
          type: SystemEventType.TEST_EXECUTED,
          payload: {
            testId: command.payload.testId,
            testName: command.payload.testName,
            result: 'success',
            executedAt: new Date(),
            numberExecutedTests: this.numberExecutedTests + 1,
            parameters: command.payload.parameters,
          }
        }];

      case SystemCommandType.EXECUTE_RETRYABLE_TEST:
        if (this.version % 2 === 0) {
          throw new BusinessRuleViolation('Retryable error', undefined, true);
        }
        return [{
          type: SystemEventType.RETRYABLE_TEST_EXECUTED,
          payload: {
            testId: command.payload.testId,
            testName: command.payload.testName,
            result: 'success',
            executedAt: new Date(),
            parameters: command.payload.parameters,
          }
        }];

      default:
        return [];
    }
  }

  apply(event: SystemEvent): void {
    switch (event.type) {
      case SystemEventType.TEST_EXECUTED:
        this.numberExecutedTests++;
        break;
    }

    this.version++;
  }
}
```

---

## 3. `sagas/system.saga.ts`

For the saga, we can use the same structure as `OrderSaga` in `core/order/sagas/order.saga.ts`.

```ts
import { Event } from '../../contracts';
import { SystemCommandType } from '../contracts';

export function systemSaga(event: Event): any[] {
  if (event.type === 'multiEventEmitted' && event.payload.index === 2) {
    return [{ type: SystemCommandType.LOG_MESSAGE, payload: { message: 'auto-triggered from saga' } }];
  }

  return [];
}
```

---

## 4. `access.ts`

```ts
import { registerCondition } from '../policy-registry';

export enum SystemAccessCondition {
  CAN_TRIGGER_FAILURE = 'system.canTriggerFailure',
  CAN_EMIT_EVENTS = 'system.canEmitEvents',
}

export interface SystemAccessContext {
  role: 'system' | 'tester' | 'developer';
}

registerCondition(SystemAccessCondition.CAN_TRIGGER_FAILURE, ({ role }: SystemAccessContext) =>
  role === 'system'
);

registerCondition(SystemAccessCondition.CAN_EMIT_EVENTS, ({ role }: SystemAccessContext) =>
  role === 'tester' || role === 'system' || role === 'developer'
);

export const systemAccessModel = {
  actors: {
    tester: ['logMessage', 'emitMultipleEvents'],
    system: ['simulateFailure'],
  },
};
```

---

## 5. `index.ts`

```ts
export * from './contracts';
export * from './access';
export { systemSaga } from './sagas/system.saga';
export { SystemAggregate } from './aggregates/system.aggregate';
```

---

Based on your `OrderAggregate`, here's an updated and **expanded plan for the `SystemAggregate`** — including new test simulation capabilities like `executeTest`, `numberExecutedTests`, and `retryable business logic`.

---

## Supported Use Cases

| Command Type           | What It Does                                                              | Test Focus                                    |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `logMessage`           | Emits `messageLogged` with message payload                                | End-to-end basic event path                   |
| `simulateFailure`      | Throws immediately                                                        | Retry, failure handling, workflow recovery    |
| `emitMultipleEvents`   | Emits N `multiEventEmitted` events                                        | Fan-out, projection fan-out (future)          |
| `executeTest`          | Increments `numberExecutedTests`, emits stateful `testExecuted`           | Snapshot accuracy, causation ID, state growth |
| `executeRetryableTest` | Fails on even versions, succeeds on retry → emits `retryableTestExecuted` | Retry safety, Temporal retry policy testing   |
| Saga auto-reaction     | Emits follow-up command at specific index                                 | Validates reactive orchestration              |

## Tests

Tests should exist in `core/system/__tests__/system.aggregate.test.ts` and `core/system/__tests__/system.saga.test.ts`.

Tests are run with `npm run test:core`