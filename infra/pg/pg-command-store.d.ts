import { Pool } from 'pg';
import { Command, UUID } from '../../core/contracts';
import { CommandResult } from '../contracts';
import { CommandStorePort } from '../../core/ports';
export declare class PgCommandStore implements CommandStorePort {
    pool: Pool;
    constructor(connectionConfig?: any);
    private setTenantContext;
    upsert(cmd: Command): Promise<void>;
    markStatus(id: UUID, status: 'pending' | 'consumed' | 'failed', result?: CommandResult): Promise<void>;
    getById(id: UUID): Promise<Command | null>;
    query(filter: {
        status?: 'pending' | 'consumed' | 'failed';
        tenant_id?: UUID;
        type?: string;
        limit?: number;
        offset?: number;
    }): Promise<Command[]>;
    delete(id: UUID): Promise<void>;
    close(): Promise<void>;
}
