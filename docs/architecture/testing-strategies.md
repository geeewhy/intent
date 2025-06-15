# Testing Strategies and CI

This document describes the testing approach of Intent for those maintaining or extending the system. It covers the multi-level testing methodology, key testing patterns, and integration with CI/CD pipelines.

## Testing Philosophy

Intent follows a testing strategy that covers multiple levels of the application, from unit tests of individual components to integration tests of the entire system. This approach ensures that both the individual parts and the system as a whole function correctly and reliably.

The testing strategy is designed to:

1. **Verify Correctness**: Ensure that the system behaves as expected
2. **Prevent Regressions**: Catch issues before they reach production
3. **Document Behavior**: Serve as living documentation of how the system works
4. **Support Refactoring**: Enable safe refactoring and evolution of the codebase
5. **Validate Cross-Cutting Concerns**: Verify multi-tenancy, observability, and other architectural aspects

## Testing Levels

Intent implements a multi-level testing approach, with different types of tests focusing on different aspects of the system.

### Unit Tests

Unit tests focus on testing individual components in isolation, typically mocking or stubbing dependencies. In Intent, unit tests are organized in `__tests__` directories alongside the code they test.

Key unit test examples:

#### Base Component Tests

These tests verify the core abstractions and base classes:

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

#### Domain Component Tests

These tests verify domain-specific implementations:

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

#### Command Processing Tests

These tests verify the end-to-end flow of command processing:

```typescript
// From src/infra/integration-tests/commands.test.ts
test('can dispatch a command and get events', async () => {
  const cmd = {
    id: uuidv4(),
    tenant_id: tenantId,
    type: SystemCommandType.EXECUTE_TEST,
    payload: {
      systemId: systemId,
      testId: uuidv4(),
      testName: 'integration-test',
    },
    metadata: {
      userId: testerId,
      role: 'tester',
      timestamp: new Date()
    }
  };

  const result = await dispatchCommand(cmd);
  
  expect(result.status).toBe('success');
  expect(result.events).toHaveLength(1);
  expect(result.events[0].type).toBe(SystemEventType.TEST_EXECUTED);
  // ... more assertions
});
```

#### Projection Tests

These tests verify that events are correctly projected to read models:

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

#### Multi-Tenancy Tests

These tests verify tenant isolation:

```typescript
// From src/infra/integration-tests/projection.integration.test.ts
// Verify tenant isolation
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id === tenantId)).toBe(true);
expect(result.rows.every((row: { tenant_id: any; }) => row.tenant_id !== tenantId2)).toBe(true);
```

These tests ensure that data from one tenant is not visible to another tenant, which is critical for a multi-tenant system.

#### Observability Tests

These tests verify that the observability infrastructure works correctly:

```typescript
// From src/infra/integration-tests/otel.test.ts
it('emits a projection.handle span', async () => {
  memoryExporter.reset();

  const evt: Event = {
    id: randomUUID(),
    type: 'testExecuted',
    // ... other fields
  };

  await projectEvents([evt], pool);

  const spans = memoryExporter.getFinishedSpans();
  expect(spans.length).toBeGreaterThan(0);
  expect(spans[0].name).toBe('projection.handle.testExecuted');
});
```

This test verifies that spans are created for observability, ensuring that the tracing infrastructure works correctly.

## Testing Patterns

Intent follows several key testing patterns to ensure effective and maintainable tests.

### Arrange-Act-Assert

Tests are structured using the Arrange-Act-Assert pattern:

1. **Arrange**: Set up the test data and environment
2. **Act**: Perform the operation being tested
3. **Assert**: Verify the results

This pattern makes tests clear and easy to understand.

### Test Setup and Cleanup

Tests use Jest's lifecycle hooks for setup and cleanup:

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

Tests use helper functions and factories to generate test data:

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

Tests verify that errors are thrown when expected:

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

Intent uses several tools and techniques to support testing.

### Test Database

Integration tests use a real PostgreSQL database, configured through environment variables:

```typescript
// From src/infra/integration-tests/setup.ts
const pool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_NAME || 'intent_test',
});
```

This allows tests to verify actual database interactions.

### In-Memory Adapters

For faster unit tests, Intent provides in-memory implementations of key interfaces:

```typescript
// Example of an in-memory event store for testing
export class InMemoryEventStore implements EventStorePort {
  private events: Record<string, Event[]> = {};
  private snapshots: Record<string, Snapshot<any>> = {};

  async appendEvents(tenantId: UUID, events: Event[]): Promise<void> {
    // Implementation
  }

  async loadEvents(
    tenantId: UUID,
    aggregateType: string,
    aggregateId: UUID,
    afterVersion?: number
  ): Promise<Event[]> {
    // Implementation
  }

  // Other methods
}
```

These in-memory adapters allow tests to run quickly without external dependencies.

### Test Utilities

Intent includes various test utilities to simplify testing:

```typescript
// From src/infra/observability/otel-test-tracer.ts
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const memoryExporter = new InMemorySpanExporter();

const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
});

provider.register({ contextManager });
```

These utilities make it easier to write tests and verify system behavior.

## Continuous Integration

Intent uses CI pipelines to run tests automatically and ensure code quality.

### CI Workflows

The CI pipeline includes several workflows:

1. **Unit Tests**: Run all unit tests
2. **Integration Tests**: Run all integration tests
3. **Core Linter**: Verify core domain consistency
4. **Projection Linter**: Verify projection access policies
5. **Drift Checker**: Verify projection schema consistency

### Specialized Linters

In addition to standard tests, Intent includes specialized linters:

1. **Core Domain Linter**: Verifies that every command has a routing (aggregate) defined, all roles and commands are registered in the access model, etc.
2. **Projection RLS Policy Linter**: Checks that every read model (projection) has proper access control defined and that RLS policies cover all roles/columns as expected.
3. **Projection Drift Checker**: Detects schema drift between code and the database.

These linters run in CI to catch issues early:

```typescript
// Example of running the projection linter in CI
const result = await checkProjectionPolicies(pool);
if (result.errors.length > 0) {
  console.error('Projection policy check failed:', result.errors);
  process.exit(1);
}
```

## Best Practices for Writing Tests

When adding new features to Intent, follow these testing best practices:

1. **Write Unit Tests First**: Start with unit tests for new components
2. **Add Integration Tests**: Verify that the new components work with the rest of the system
3. **Test Edge Cases**: Include tests for error conditions and edge cases
4. **Verify Multi-Tenancy**: Ensure that tenant isolation is maintained
5. **Check Observability**: Verify that the new code is properly instrumented for observability
6. **Run Linters**: Use the specialized linters to catch issues early

Example of a good test structure:

```typescript
describe('MyNewFeature', () => {
  // Setup code

  describe('GIVEN Command TYPE, When Payload {}', () => {
    it('Expect outcome', () => {
      // Expect your event or failure modes
    });
  });
  
  // Cleanup code
});
```

## Benefits and Challenges

### Benefits

1. **Confidence**: Comprehensive tests provide confidence that the system works correctly
2. **Documentation**: Tests serve as living documentation of how the system should behave
3. **Regression Prevention**: Tests catch regressions before they reach production
4. **Refactoring Support**: Tests make it safer to refactor and evolve the codebase
5. **Quality Assurance**: CI integration ensures consistent quality

### Challenges

1. **Test Performance**: Integration tests can be slow due to database interactions
2. **Test Independence**: Ensuring tests don't interfere with each other
3. **Test Data Management**: Creating and cleaning up test data
4. **Environment Dependencies**: Managing test environment configuration
5. **Temporal Workflow Testing**: Testing long-running workflows can be challenging

Intent addresses these challenges through isolation techniques, and specialized testing tools.

## Conclusion

Testing is a core part of Intent's development process, ensuring that the system remains reliable, maintainable, and evolvable. By following the testing patterns and practices described in this document, developers can contribute to Intent with confidence, knowing that their changes will be thoroughly tested and validated.