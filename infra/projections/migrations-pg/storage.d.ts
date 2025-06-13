import { Pool } from 'pg';
export interface ExtraMeta {
    projection?: string | null;
    tables?: string[] | null;
    sqlHash?: string | null;
    forced?: boolean;
}
export declare class UmzugPgStorage {
    private pool;
    private table;
    constructor(pool: Pool, table: string);
    private ensure;
    logMigration({ name }: {
        name: string;
    }): Promise<void>;
    unlogMigration({ name }: {
        name: string;
    }): Promise<void>;
    executed(): Promise<any[]>;
    attachMeta(name: string, meta: ExtraMeta): Promise<void>;
}
