//src/tools/setup/tests/flows/eventstore/initial.loader.spec.ts
/**
 * GIVEN the event-store flow, defaultProvider postgres and the
 * "initial" path declared in flow.yaml
 * WHEN loadFlow is invoked with no CLI overrides
 * THEN it should
 *   – resolve provider === 'postgres'
 *   – resolve pathName  === 'initial'
 *   – return exactly the three expected step files in order
 */
import path from 'node:path';
import { loadFlow } from '../../../flows/loader';

describe('loader – eventstore initial', () => {
  const flowName = 'eventstore';
  // Use the same path resolution logic as getFlowsRoot in test environment
  const root = path.join(process.cwd(), 'src', 'tools', 'setup', 'flows');

  it('picks default provider and path', async () => {
    const result = await loadFlow(flowName, {});  // no flags
    expect(result.provider).toBe('postgres');
    expect(result.pathName).toBe('initial');

    const expected = [
      'connection.ts',
      'reset.ts',
      'schema.ts'
    ].map(f => path.join(root, flowName, 'providers/postgres/steps', f));

    expect(result.stepPaths).toEqual(expected);
  });

  it('respects provider override', async () => {
    // This test will fail until we add another provider
    // Just testing the override mechanism works
    try {
      await loadFlow(flowName, { provider: 'mysql' });
      fail('Should have thrown an error for non-existent provider');
    } catch (error) {
      expect((error as Error).message).toContain('Provider mysql not found');
    }
  });

  it('respects path override', async () => {
    const result = await loadFlow(flowName, { path: 'upgrade' });
    expect(result.provider).toBe('postgres');
    expect(result.pathName).toBe('upgrade');

    const expected = [
      'connection.ts',
      'schema.ts',
    ].map(f => path.join(root, flowName, 'providers/postgres/steps', f));

    expect(result.stepPaths).toEqual(expected);
  });

  it('throws on invalid path', async () => {
    try {
      await loadFlow(flowName, { path: 'nonexistent' });
      fail('Should have thrown an error for non-existent path');
    } catch (error) {
      expect((error as Error).message).toContain('Path nonexistent not found');
    }
  });
});
