# Testing Strategies in Intent

## Overview

Intent implements a comprehensive testing strategy that covers multiple levels of the application, from unit tests of individual components to integration tests of the entire system. This approach ensures that both the individual parts and the system as a whole function correctly and reliably.

## Testing Levels

### Unit Tests

Unit tests focus on testing individual components in isolation, typically mocking or stubbing dependencies. In Intent, unit tests are organized in `__tests__` directories alongside the code they test.

Key unit test examples:

1. **Base Component Tests**: Testing the core abstractions and base classes
   - `src/core/base/__tests__/aggregate.test.ts`: Tests for the BaseAggregate class

2. **Domain Component Tests**: Testing domain-specific implementations
   - `src/core/system/__tests__/system.aggregate.test.ts`: Tests for the SystemAggregate class
   - `src/core/system/__tests__/system-status.projection.test.ts`: Tests for the system status projection
   - `src/core/system/__tests__/system.saga.test.ts`: Tests for the system saga

#### Example: BaseAggregate Unit Tests

The BaseAggregate tests demonstrate a thorough approach to unit testing:

```typescript
// From src/core/base/__tests__/aggregate.test.ts
describe('BaseAggregate', () => {
  describe('toSnapshot', () => {
    it('should create a snapshot with the correct structure', () => {
      // Arrange
      const aggregateId = 'test-aggregate-id';
      const aggregate = new ExampleAggregate(aggregateId);

      // Apply some events to change the state
      aggregate.apply(ExampleAggregate.createNameChangedEvent(aggregateId, 'Test Aggregate'));
      aggregate.apply(ExampleAggregate.createCounterIncrementedEvent(aggregateId, 5));
      aggregate.apply(ExampleAggregate.createItemAddedEvent(aggregateId, 'item1'));

      // Act
      const snapshot = aggregate.toSnapshot();

      // Assert
      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe(aggregateId);
      expect(snapshot.type).toBe('example');
      // ... more assertions
    });
  });

  // ... more test cases
});
```

This test follows the Arrange-Act-Assert pattern and tests a specific functionality (snapshot creation) in isolation.

#### Example: Domain-Specific Unit Tests

The SystemAggregate tests show how domain-specific behavior is tested:

```typescript
// From src/core/system/__tests__/system.aggregate.test.ts
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
  // ... more assertions
  systemAggregate.apply(events[0]);
  expect(systemAggregate.numberExecutedTests).toBe(1);
});
```

This test verifies that the domain logic (executing a test and incrementing the counter) works correctly.

### Integration Tests

Integration tests verify that different components work together correctly. Intent has extensive integration tests in the `src/infra/integration-tests` directory:

1. **Command Processing Tests**: `commands.test.ts`
   - Tests the end-to-end flow of command processing
   - Verifies that commands create the correct events and update aggregates

2. **Event Store Tests**: `events.test.ts`
   - Tests storing and retrieving events from the event store
   - Verifies event versioning and concurrency control

3. **Projection Tests**: `projection.integration.test.ts`
   - Tests that events are correctly projected to read models
   - Verifies multi-tenancy isolation in projections

4. **Snapshot Tests**: `snapshots.test.ts`
   - Tests creating and loading snapshots
   - Verifies that snapshots optimize aggregate loading

5. **Observability Tests**: `otel.test.ts`
   - Tests that spans are created for observability
   - Verifies that the tracing infrastructure works correctly

#### Example: Projection Integration Test

```typescript
// From src/infra/integration-tests/projection.integration.test.ts
test('TEST_EXECUTED command creates a record in system_status table', async () => {
  // Create a unique test ID
  const testId = uuidv4();
  const testName = 'integration-test';

  // Create and dispatch a command
  const cmd = {
    id: uuidv4(),
    tenant_id: tenantId,
    type: SystemCommandType.EXECUTE_TEST,
    payload: {
      systemId: systemId,
      testId,
      testName,
    },
    metadata: {
      userId: testerId,
      role: 'tester',
      timestamp: new Date()
    }
  };

  await dispatchCommand(cmd);

  // Verify the projection created a record
  const result = await pool.query(sql`
    SELECT * FROM system_status WHERE id = ${systemId}
  `);

  expect(result.rows).toHaveLength(1);
  const record = result.rows[0];
  expect(record.id).toBe(systemId);
  expect(record.tenant_id).toBe(tenantId);
  expect(record.testName).toBe(testName);
  expect(record.result).toBe('success');
  expect(record.numberExecutedTests).toBe(1);
});
```

This test verifies the entire flow from command dispatch to projection update, ensuring that the system works end-to-end.

### Multi-Tenancy Testing

The system includes specific tests for multi-tenancy isolation:

```typescript
// From src/infra/integration-tests/projection.integration.test.ts
// Verify tenant isolation
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)).toBe(true);
```

These tests ensure that data from one tenant is not visible to another tenant, which is critical for a multi-tenant system.

## Testing Patterns

### Test Setup and Cleanup

The tests use Jest's `beforeEach`, `afterEach`, `beforeAll`, and `afterAll` hooks for setup and cleanup:

```typescript
// From src/infra/integration-tests/snapshots.test.ts
beforeAll(async () => {
  // Setup code
  tenantId = process.env.TEST_TENANT_ID || 'test-tenant';
  // More setup
}, TEST_TIMEOUT);

afterAll(async () => {
  // Cleanup code
  await pool.end();
});
```

This ensures that each test starts with a clean state and that resources are properly released after tests.

### Test Data Generation

The tests use helper functions and factories to generate test data:

```typescript
// From src/core/base/__tests__/aggregate.test.ts
static createItemAddedEvent(aggregateId: UUID, item: string): Event<ItemAddedPayload> {
  return {
    id: `event-${Math.random().toString(36).substring(2, 9)}`,
    tenant_id: 'test-tenant',
    type: ExampleEventType.ITEM_ADDED,
    aggregateId,
    aggregateType: 'example',
    version: 1,
    payload: { item }
  };
}
```

This makes tests more readable and reduces duplication.

### Error Testing

The tests verify that errors are thrown when expected:

```typescript
// From src/core/system/__tests__/system.aggregate.test.ts
test('should throw error on simulate failure', () => {
  const command = {
    id: 'test-id',
    tenant_id: 'test-tenant',
    type: SystemCommandType.SIMULATE_FAILURE as const,
    payload: {} as SimulateFailurePayload
  };

  expect(() => systemAggregate.handle(command)).toThrow('Simulated failure');
});
```

This ensures that the system handles error conditions correctly.

## Testing Infrastructure

### Test Database

Integration tests use a real PostgreSQL database, configured through environment variables:

```typescript
// From src/infra/integration-tests/setup.ts
console.log('TEST_TENANT_ID:', process.env.TEST_TENANT_ID);
```

This allows tests to verify actual database interactions.

### Test Timeouts

Tests that involve external resources or asynchronous operations have configurable timeouts:

```typescript
// From src/infra/integration-tests/commands.test.ts
const TEST_TIMEOUT = 30000; // 30 seconds
```

This prevents tests from hanging indefinitely if something goes wrong.

### In-Memory Tracing

Observability tests use an in-memory span exporter:

```typescript
// From src/infra/integration-tests/otel.test.ts
memoryExporter.reset();
// ... test code
const spans = memoryExporter.getFinishedSpans();
expect(spans.length).toBeGreaterThan(0);
```

This allows testing the observability infrastructure without external dependencies.

## Benefits of the Testing Approach

1. **Comprehensive Coverage**: Tests cover both individual components and their interactions
2. **Isolation**: Unit tests verify component behavior in isolation
3. **Integration**: Integration tests verify system behavior as a whole
4. **Multi-Tenancy Verification**: Tests ensure tenant isolation
5. **Error Handling**: Tests verify that errors are handled correctly

## Challenges and Considerations

1. **Test Performance**: Integration tests can be slow due to database interactions
2. **Test Independence**: Ensuring tests don't interfere with each other
3. **Test Data Management**: Creating and cleaning up test data
4. **Environment Dependencies**: Managing test environment configuration
5. **Temporal Workflow Testing**: Testing long-running workflows can be challenging

## Integration with Other Patterns

Testing in Intent integrates with several other patterns:

1. **Event Sourcing**: Tests verify event creation, storage, and replay
2. **CQRS**: Tests verify command handling and projection updates
3. **Domain-Driven Design**: Tests verify domain logic and aggregate behavior
4. **Multi-tenancy**: Tests verify tenant isolation
5. **Observability**: Tests verify tracing and monitoring
