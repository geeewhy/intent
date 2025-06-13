import { Pool } from 'pg';
declare const pool: Pool;
export declare const testConnection: () => Promise<{
    connected: boolean;
    timestamp: any;
    error?: undefined;
} | {
    connected: boolean;
    error: string;
    timestamp?: undefined;
}>;
export default pool;
