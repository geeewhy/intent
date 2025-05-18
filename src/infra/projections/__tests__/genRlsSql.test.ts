import { genRlsSql } from '../genRlsSql';

describe('genRlsSql', () => {
  test('generates policy statements', () => {
    const migrations = genRlsSql();
    expect(migrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining('policy-rls-system.read.system_status.own'),
          sql: expect.stringContaining('CREATE POLICY "system.read.system_status.own"'),
        }),
      ])
    );
  });
});
