/**
 * Interface for RLS policy SQL statements
 */
export interface RlsPolicySql {
    tableName: string;
    condition: string;
    enableRlsQuery: string;
    dropPolicyQuery: string;
    createPolicyQuery: string;
    commentPolicyQuery?: string;
}
/**
 * Generates SQL for Row Level Security (RLS) policies based on read model policies
 * @returns Array of SQL statements for RLS policies
 */
export declare function generateRlsPolicies(): Promise<RlsPolicySql[]>;
