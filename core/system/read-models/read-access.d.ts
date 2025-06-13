import { AccessContext } from '../../contracts';
import { SystemRole } from '../contracts';
export declare const SystemReadModelScopes: {
    readonly SYSTEM_STATUS_OWN: "system.read.system_status.own";
    readonly SYSTEM_STATUS_ALL: "system.read.system_status.all";
};
export type SystemReadModelScope = typeof SystemReadModelScopes[keyof typeof SystemReadModelScopes];
export declare const SystemReadModelScopeGrants: Record<SystemRole, SystemReadModelScope[]>;
export declare function getScopesForRole(role: SystemRole): SystemReadModelScope[];
export type ReadAccessPolicy = {
    table: string;
    condition: string;
    isAuthorized?: (ctx: AccessContext) => boolean;
    enforcement?: {
        sql?: () => string;
        mongo?: (ctx: AccessContext) => any;
        redact?: (record: any, ctx: AccessContext) => any;
    };
};
export declare const ReadModelPolicies: Record<SystemReadModelScope, ReadAccessPolicy>;
