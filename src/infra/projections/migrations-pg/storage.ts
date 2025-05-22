import { Pool } from 'pg';

export interface ExtraMeta {
    projection?: string | null;
    tables?: string[] | null;
    sqlHash?: string | null;
    forced?: boolean;
}

export class UmzugPgStorage {
    constructor(private pool: Pool, private table: string) {}

    private async ensure() {
        await this.pool.query(`
      create schema if not exists infra;
      create table if not exists ${this.table} (
        name            text primary key,
        executed_at     timestamptz not null,
        projection_name text,
        tables          text[],
        sql_hash        text,
        forced_at       timestamptz
      );
    `);
    }

    /* core API used by Umzug */
    async logMigration({ name }: { name: string }) {
        await this.ensure();
        await this.pool.query(
            `insert into ${this.table}(name, executed_at)
             values ($1, now())
                 on conflict do nothing`,
            [name],
        );
    }
    async unlogMigration({ name }: { name: string }) {
        await this.ensure();
        await this.pool.query(`delete from ${this.table} where name = $1`, [name]);
    }
    async executed() {
        await this.ensure();
        const res = await this.pool.query(
            `select name from ${this.table} order by executed_at`,
        );
        return res.rows.map(r => r.name);
    }

    /* helper for executor to upsert extra columns */
    async attachMeta(name: string, meta: ExtraMeta) {
        await this.pool.query(
            `update ${this.table}
         set projection_name = coalesce($2, projection_name),
             tables          = coalesce($3, tables),
             sql_hash        = coalesce($4, sql_hash),
             forced_at       = case when $5 then now() else forced_at end
       where name = $1`,
            [name, meta.projection, meta.tables, meta.sqlHash, meta.forced ?? false],
        );
    }
}
