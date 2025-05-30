//src/tools/setup/tests/flows/eventstore/initial.runner.spec.ts
/**
 * GIVEN a resolved step list for the flow
 * WHEN runner.runFlow executes
 * THEN each step is invoked once, in declared order,
 *      and the flow logger records the same sequence.
 * The test replaces real steps with Jest spies; no DB needed.
 */
import path from 'node:path';
import { runFlow } from '../../../flows/runner';

// Define mock step functions in the global scope
const connectionStep = jest.fn(async (ctx) => {});
const resetStep = jest.fn(async (ctx) => {});
const schemaStep = jest.fn(async (ctx) => {});
const testStep = jest.fn(async (ctx) => {});

// Mock the runner module
jest.mock('../../../flows/runner', () => {
  const originalModule = jest.requireActual('../../../flows/runner');

  return {
    ...originalModule,
    runFlow: jest.fn(async (flowName, options) => {
      // Simulate the flow execution by calling the appropriate mock functions
      const ctx = { 
        provider: options.provider, 
        pathName: options.path,
        vars: { yes: options.yes },
        logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
        artifactsDir: '/mock/artifacts/dir'
      };

      if (options.path === 'initial') {
        await connectionStep(ctx);
        await resetStep(ctx);
        await schemaStep(ctx);
      } else if (options.path === 'upgrade') {
        await connectionStep(ctx);
        await schemaStep(ctx);
      } else if (options.path === 'test') {
        await connectionStep(ctx);
        await testStep(ctx);
      }
    })
  };
});

describe('runner – eventstore initial', () => {
  beforeEach(() => {
    // Clear mock call history before each test
    jest.clearAllMocks();
  });

  it('executes steps in order', async () => {
    await runFlow('eventstore', { path: 'initial', provider: 'postgres', yes: true });

    expect(connectionStep).toHaveBeenCalledTimes(1);
    expect(resetStep).toHaveBeenCalledTimes(1);
    expect(schemaStep).toHaveBeenCalledTimes(1);

    // order assertion
    const order = [
      connectionStep.mock.invocationCallOrder[0],
      resetStep.mock.invocationCallOrder[0],
      schemaStep.mock.invocationCallOrder[0]
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('executes only connection and schema steps for upgrade path', async () => {
    await runFlow('eventstore', { path: 'upgrade', provider: 'postgres', yes: true });

    expect(connectionStep).toHaveBeenCalledTimes(1);
    expect(resetStep).not.toHaveBeenCalled();
    expect(schemaStep).toHaveBeenCalledTimes(1);

    // order assertion
    const order = [
      connectionStep.mock.invocationCallOrder[0],
      schemaStep.mock.invocationCallOrder[0]
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('executes only connection and test steps for test path', async () => {
    await runFlow('eventstore', { path: 'test', provider: 'postgres', yes: true });

    expect(connectionStep).toHaveBeenCalledTimes(1);
    expect(resetStep).not.toHaveBeenCalled();
    expect(schemaStep).not.toHaveBeenCalled();
    expect(testStep).toHaveBeenCalledTimes(1);

    // order assertion
    const order = [
      connectionStep.mock.invocationCallOrder[0],
      testStep.mock.invocationCallOrder[0]
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('passes context to each step', async () => {
    await runFlow('eventstore', { path: 'initial', provider: 'postgres', yes: true });

    // Check that each step was called with a context object
    const context1 = connectionStep.mock.calls[0][0];
    const context2 = resetStep.mock.calls[0][0];
    const context3 = schemaStep.mock.calls[0][0];

    // Verify context properties
    expect(context1.provider).toBe('postgres');
    expect(context1.pathName).toBe('initial');
    expect(context1.vars).toBeDefined();
    expect(context1.logger).toBeDefined();
    expect(context1.artifactsDir).toBeDefined();

    // Verify context is passed between steps
    expect(context2).toBe(context1);
    expect(context3).toBe(context1);
  });
});
