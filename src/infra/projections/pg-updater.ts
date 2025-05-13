import { ReadModelUpdaterPort } from '../../core/contracts';
import { sql } from 'slonik';
import type { DatabasePool } from 'slonik';

export function createPgUpdaterFor<T>(tableName: string, pool: DatabasePool): ReadModelUpdaterPort<T> {
  return {
    async upsert(tenantId: string, id: string, data: T): Promise<void> {
      const fullData = {
        ...data,
        id,
        tenant_id: tenantId,
      };

      const columns = Object.keys(fullData);
      const rawValues = Object.values(fullData);

      const values = rawValues.map(v => {
        if (v === undefined) return null;
        if (v instanceof Date) return sql`${v.toISOString()}`;
        if (typeof v === 'object' && v !== null) return sql`${JSON.stringify(v)}`;
        return sql`${v}`;
      });

      await pool.query(sql`
        INSERT INTO ${sql.identifier([tableName])} (
          ${sql.join(columns.map(c => sql.identifier([c])), sql`, `)}
        )
        VALUES (
                 ${sql.join(values, sql`, `)}
               )
          ON CONFLICT (id) DO UPDATE SET
          ${sql.join(
              columns.map(c => sql`${sql.identifier([c])} = EXCLUDED.${sql.identifier([c])}`),
              sql`, `
          )}
      `);
    },

    async remove(tenantId: string, id: string): Promise<void> {
      await pool.query(sql`
        DELETE FROM ${sql.identifier([tableName])}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);
    }
  };
}
