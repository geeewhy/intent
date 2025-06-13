"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadModelPolicies = exports.SystemReadModelScopeGrants = exports.SystemReadModelScopes = void 0;
exports.getScopesForRole = getScopesForRole;
exports.SystemReadModelScopes = {
    SYSTEM_STATUS_OWN: 'system.read.system_status.own',
    SYSTEM_STATUS_ALL: 'system.read.system_status.all',
};
exports.SystemReadModelScopeGrants = {
    tester: [exports.SystemReadModelScopes.SYSTEM_STATUS_OWN],
    developer: [exports.SystemReadModelScopes.SYSTEM_STATUS_ALL],
    system: [exports.SystemReadModelScopes.SYSTEM_STATUS_ALL],
};
function getScopesForRole(role) {
    return exports.SystemReadModelScopeGrants[role] ?? [];
}
exports.ReadModelPolicies = {
    [exports.SystemReadModelScopes.SYSTEM_STATUS_OWN]: {
        table: 'system_status',
        condition: exports.SystemReadModelScopes.SYSTEM_STATUS_OWN,
        isAuthorized: ({ scopes }) => scopes?.includes(exports.SystemReadModelScopes.SYSTEM_STATUS_OWN) ?? false,
        enforcement: {
            sql: () => `
current_setting('request.jwt.claims', true)::json->>'user_id' = "testerId"
    AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text
`,
            redact: (record, ctx) => {
                if (ctx.role === 'tester') {
                    const { privateNotes, ...rest } = record;
                    return rest;
                }
                return record;
            },
        },
    },
    [exports.SystemReadModelScopes.SYSTEM_STATUS_ALL]: {
        table: 'system_status',
        condition: exports.SystemReadModelScopes.SYSTEM_STATUS_ALL,
        isAuthorized: ({ scopes }) => scopes?.includes(exports.SystemReadModelScopes.SYSTEM_STATUS_ALL) ?? false,
        enforcement: {
            sql: () => `
current_setting('request.jwt.claims', true)::json->>'role' IN ('developer', 'system')
AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text  
      `,
        },
    },
};
//# sourceMappingURL=read-access.js.map