import { globSync } from 'glob';

export interface RlsMigration {
  name: string;
  sql: string;
}

/**
 * Gather SQL statements to enforce row level security for read models
 */
export function genRlsSql(): RlsMigration[] {
  const policyFiles = globSync('src/core/**/read-models/read-access.ts', { absolute: true });
  const migrations: RlsMigration[] = [];
  const enabled = new Set<string>();

  for (const file of policyFiles) {
    const mod = require(file);
    const policies: Record<string, any> | undefined =
      mod.ReadModelPolicies || mod.SystemReadModelPolicies;
    if (!policies) continue;

    for (const policy of Object.values(policies) as any[]) {
      const sqlFn = policy.enforcement?.sql;
      if (!sqlFn) continue;
      if (!enabled.has(policy.table)) {
        migrations.push({
          name: `policy-rls-enable-${policy.table}`,
          sql: `ALTER TABLE ${policy.table} ENABLE ROW LEVEL SECURITY;`,
        });
        enabled.add(policy.table);
      }
      let usingSql = sqlFn().trim();
      if (!usingSql.includes('tenant_id')) {
        usingSql = `${usingSql}\n  AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;
      }
      migrations.push({
        name: `policy-rls-${policy.condition}`,
        sql: `CREATE POLICY "${policy.condition}" ON ${policy.table} FOR SELECT USING (\n  ${usingSql}\n);\nCOMMENT ON POLICY "${policy.condition}" ON ${policy.table} IS 'RLS for ${policy.condition}';`,
      });
    }
  }

  return migrations;
}
