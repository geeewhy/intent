// core/system/read-models/read-access.ts
import { AccessContext } from '../../../contracts';
import {SystemRole} from '../contracts';

export const SystemReadModelScopes = {
    SYSTEM_STATUS_OWN: 'system.read.system_status.own',
    SYSTEM_STATUS_ALL: 'system.read.system_status.all',
} as const

export type SystemReadModelScope =
    typeof SystemReadModelScopes[keyof typeof SystemReadModelScopes]

export const SystemReadModelScopeGrants: Record<SystemRole, SystemReadModelScope[]> = {
    tester: [SystemReadModelScopes.SYSTEM_STATUS_OWN],
    developer: [SystemReadModelScopes.SYSTEM_STATUS_ALL],
    system: [SystemReadModelScopes.SYSTEM_STATUS_ALL],
}

export function getScopesForRole(role: SystemRole): SystemReadModelScope[] {
    return SystemReadModelScopeGrants[role] ?? []
}

export type ReadAccessPolicy = {
    table: string
    condition: string
    isAuthorized?: (ctx: AccessContext) => boolean
    enforcement?: {
        sql?: () => string
        mongo?: (ctx: AccessContext) => any
        redact?: (record: any, ctx: AccessContext) => any
    }
}

export const ReadModelPolicies: Record<SystemReadModelScope, ReadAccessPolicy> = {
    [SystemReadModelScopes.SYSTEM_STATUS_OWN]: {
        table: 'system_status',
        condition: SystemReadModelScopes.SYSTEM_STATUS_OWN,
        isAuthorized: ({ scopes }) => scopes?.includes(SystemReadModelScopes.SYSTEM_STATUS_OWN) ?? false,
        enforcement: {
            sql: () => `
current_setting('request.jwt.claims', true)::json->>'user_id' = "testerId"
    AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text
`,
            redact: (record, ctx) => {
                if (ctx.role === 'tester') {
                    const { privateNotes, ...rest } = record
                    return rest
                }
                return record
            },
        },
    },
    [SystemReadModelScopes.SYSTEM_STATUS_ALL]: {
        table: 'system_status',
        condition: SystemReadModelScopes.SYSTEM_STATUS_ALL,
        isAuthorized: ({ scopes }) => scopes?.includes(SystemReadModelScopes.SYSTEM_STATUS_ALL) ?? false,
        enforcement: {
            sql: () => `
current_setting('request.jwt.claims', true)::json->>'role' IN ('developer', 'system')
AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text  
      `,
        },
    },
}
