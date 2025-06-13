"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgUpdaterFor = createPgUpdaterFor;
const slonik_1 = require("slonik");
function createPgUpdaterFor(tableName, pool) {
    return {
        async upsert(tenantId, id, data) {
            const fullData = {
                ...data,
                id,
                tenant_id: tenantId,
            };
            const columns = Object.keys(fullData);
            const rawValues = Object.values(fullData);
            const values = rawValues.map(v => {
                if (v === undefined)
                    return null;
                // @ts-ignore
                if (v instanceof Date)
                    return (0, slonik_1.sql) `${v.toISOString()}`;
                if (typeof v === 'object' && v !== null)
                    return (0, slonik_1.sql) `${JSON.stringify(v)}`;
                return (0, slonik_1.sql) `${v}`;
            });
            const updateQuery = (0, slonik_1.sql) `
        INSERT INTO ${slonik_1.sql.identifier([tableName])} (
          ${slonik_1.sql.join(columns.map(c => slonik_1.sql.identifier([c])), (0, slonik_1.sql) `, `)}
        )
        VALUES (
                 ${slonik_1.sql.join(values, (0, slonik_1.sql) `, `)}
               )
          ON CONFLICT (id) DO UPDATE SET
          ${slonik_1.sql.join(columns.map(c => (0, slonik_1.sql) `${slonik_1.sql.identifier([c])} = EXCLUDED.${slonik_1.sql.identifier([c])}`), (0, slonik_1.sql) `, `)}
      `;
            await pool.query(updateQuery);
        },
        async remove(tenantId, id) {
            await pool.query((0, slonik_1.sql) `
        DELETE FROM ${slonik_1.sql.identifier([tableName])}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);
        }
    };
}
//# sourceMappingURL=pg-updater.js.map