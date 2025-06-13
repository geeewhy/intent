"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgCommandStore = void 0;
const pg_1 = require("pg");
class PgCommandStore {
    constructor(connectionConfig) {
        this.pool = new pg_1.Pool(connectionConfig || {
            host: process.env.LOCAL_DB_HOST || 'localhost',
            port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
            user: process.env.LOCAL_DB_USER || 'postgres',
            password: process.env.LOCAL_DB_PASSWORD || 'postgres',
            database: process.env.LOCAL_DB_NAME || 'postgres',
        });
    }
    async setTenantContext(client, tenantId) {
        //todo add RLS to schema & test
        //await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    }
    async upsert(cmd) {
        const client = await this.pool.connect();
        try {
            await this.setTenantContext(client, cmd.tenant_id);
            await client.query(`
        INSERT INTO infra.commands (id, tenant_id, type, payload, metadata, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          payload = EXCLUDED.payload,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
      `, [
                cmd.id,
                cmd.tenant_id,
                cmd.type,
                JSON.stringify(cmd.payload || {}),
                JSON.stringify(cmd.metadata || {}),
                cmd.metadata?.timestamp || new Date()
            ]);
        }
        finally {
            client.release();
        }
    }
    async markStatus(id, status, result) {
        const client = await this.pool.connect();
        try {
            // Can't set tenant context because we don't always know tenant_id here. (If needed, join on id first.)
            await client.query(`
        UPDATE infra.commands
        SET status = $2,
            result = $3,
            updated_at = NOW()
        WHERE id = $1
      `, [id, status, result ? JSON.stringify(result) : null]);
        }
        finally {
            client.release();
        }
    }
    async getById(id) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT * FROM infra.commands WHERE id = $1`, [id]);
            if (res.rowCount === 0)
                return null;
            const row = res.rows[0];
            return {
                id: row.id,
                tenant_id: row.tenant_id,
                type: row.type,
                payload: row.payload,
                metadata: row.metadata,
                // Optionally add more if Command contract evolves
            };
        }
        finally {
            client.release();
        }
    }
    async query(filter) {
        const clauses = [];
        const params = [];
        let idx = 1;
        if (filter.status) {
            clauses.push(`status = $${idx++}`);
            params.push(filter.status);
        }
        if (filter.tenant_id) {
            clauses.push(`tenant_id = $${idx++}`);
            params.push(filter.tenant_id);
        }
        if (filter.type) {
            clauses.push(`type = $${idx++}`);
            params.push(filter.type);
        }
        let sql = `SELECT * FROM infra.commands`;
        if (clauses.length > 0)
            sql += ` WHERE ` + clauses.join(' AND ');
        sql += ` ORDER BY created_at ASC`;
        if (filter.limit) {
            sql += ` LIMIT $${idx++}`;
            params.push(filter.limit);
        }
        if (filter.offset) {
            sql += ` OFFSET $${idx++}`;
            params.push(filter.offset);
        }
        const client = await this.pool.connect();
        try {
            const res = await client.query(sql, params);
            return res.rows.map(row => ({
                id: row.id,
                tenant_id: row.tenant_id,
                type: row.type,
                payload: row.payload,
                metadata: row.metadata,
            }));
        }
        finally {
            client.release();
        }
    }
    async delete(id) {
        const client = await this.pool.connect();
        try {
            await client.query(`DELETE FROM infra.commands WHERE id = $1`, [id]);
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.PgCommandStore = PgCommandStore;
//# sourceMappingURL=pg-command-store.js.map