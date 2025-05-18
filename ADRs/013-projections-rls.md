# ADR-013: Row Level Security for Projections

**Postgres RLS | Policy-driven | Tenant-isolated | Role-based access control**

---

## Purpose

* Implement Row Level Security (RLS) for read models in PostgreSQL
* Define access policies for different user roles
* Ensure multi-tenant data isolation
* Provide a declarative way to define access policies in the domain layer
* Automatically generate and apply RLS policies during migrations

---

## Context

In a multi-tenant system with different user roles, it's crucial to ensure that users can only access data they're authorized to see. PostgreSQL's Row Level Security (RLS) feature provides a powerful mechanism to enforce access control at the database level, ensuring that unauthorized access is prevented even if the application layer has bugs or vulnerabilities.

Our system has two types of access policies:
1. **Command Access Policies**: Control who can execute specific commands
2. **Read Model Policies**: Control who can read specific data from projections

This ADR focuses on the implementation of Read Model Policies and how they're translated into PostgreSQL RLS policies.

---

## Decision

We've implemented a policy-driven approach to RLS with the following components:

### 1. **Domain-Defined Access Policies**

Access policies are defined in the domain layer, close to the read models they protect:

```ts
// core/system/read-models/read-access.ts
export const SystemReadModelScopes = {
    SYSTEM_STATUS_OWN: 'system.read.system_status.own',
    SYSTEM_STATUS_ALL: 'system.read.system_status.all',
} as const

export const SystemReadModelScopeGrants: Record<SystemRole, SystemReadModelScope[]> = {
    tester: [SystemReadModelScopes.SYSTEM_STATUS_OWN],
    developer: [SystemReadModelScopes.SYSTEM_STATUS_ALL],
    system: [SystemReadModelScopes.SYSTEM_STATUS_ALL],
}

export const ReadModelPolicies: Record<SystemReadModelScope, ReadAccessPolicy> = {
    [SystemReadModelScopes.SYSTEM_STATUS_OWN]: {
        table: 'system_status',
        condition: SystemReadModelScopes.SYSTEM_STATUS_OWN,
        isAuthorized: ({ scopes }) => scopes?.includes(SystemReadModelScopes.SYSTEM_STATUS_OWN) ?? false,
        enforcement: {
            sql: () => `current_setting('request.jwt.claims', true)::json->>'user_id' = "testerId"`,
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
      `,
        },
    },
}
```

### 2. **Command Access Policies**

Similar to read model policies, command access policies define who can execute specific commands:

```ts
// src/core/system/command-access.ts
export const systemCommandAccessModel: Record<SystemRole, string[]> = {
    tester: ['logMessage', 'emitMultipleEvents', 'executeTest'],
    system: ['simulateFailure', 'executeRetryableTest'],
    developer: ['logMessage', 'emitMultipleEvents', 'executeTest', 'executeRetryableTest'],
};

// Registers conditions like `system.canExecute.executeTest`
export const autoRegisteredCommandAccessConditions =
    registerCommandConditionsFromModel('system', systemCommandAccessModel);
```

### 3. **RLS Policy Generation**

A utility function scans all read model policies and generates SQL statements to create RLS policies:

```ts
// src/infra/projections/genRlsSql.ts
export async function generateRlsPolicies(): Promise<RlsPolicySql[]> {
  // Find all read-access.ts files
  const readAccessFiles = globSync('src/core/**/read-models/read-access.ts');
  
  for (const filePath of readAccessFiles) {
    // Dynamically import the read-access.ts file
    const module = await import(modulePath);
    
    if (!module.ReadModelPolicies) continue;
    
    const readModelPolicies = module.ReadModelPolicies as Record<string, ReadAccessPolicy>;
    
    // Process each policy
    for (const [scopeName, policy] of Object.entries(readModelPolicies)) {
      if (!policy.table || !policy.enforcement?.sql) continue;
      
      // Generate SQL for enabling RLS, dropping existing policies, and creating new policies
      // Add type casting for all ID fields
      // Add tenant_id check for multi-tenant tables if not already present
      
      policies.push({
        tableName: policy.table,
        enableRlsQuery,
        dropPolicyQuery,
        createPolicyQuery,
        commentPolicyQuery
      });
    }
  }
  
  return policies;
}
```

### 4. **Applying RLS Policies During Migrations**

RLS policies are applied after schema migrations using Umzug:

```ts
// src/infra/migrations/runMigrations.ts
// Generate and apply RLS policies
const rlsPolicies = await generateRlsPolicies();

if (rlsPolicies.length > 0) {
  // Create a new Umzug instance for RLS policies
  const rlsUmzug = new Umzug({
    migrations: rlsPolicies.map((policy, index) => {
      const policyName = `rls-policy-${policy.tableName}-${index}`;
      return {
        name: policyName,
        up: async () => {
          // Execute the RLS policy SQL statements
          await pool.query(policy.enableRlsQuery);
          await pool.query(policy.dropPolicyQuery);
          await pool.query(policy.createPolicyQuery);
          
          // Execute the comment policy SQL statement if it exists
          if (policy.commentPolicyQuery) {
            await pool.query(policy.commentPolicyQuery);
          }
          
          return Promise.resolve();
        },
        down: async () => {
          console.log(`Down migration not supported for RLS policy ${policyName}`);
          return Promise.resolve();
        }
      };
    }),
    context: pool,
    storage: new UmzugPostgresStorage({ pool, tableName: 'rls_policy_migrations' }),
    logger: console,
  });
  
  await rlsUmzug.up();
}
```

### 5. **Key Features of the RLS Implementation**

1. **Type Casting for IDs**: All ID fields are automatically cast to text to ensure proper comparison with JWT claims
2. **Tenant Isolation**: All multi-tenant tables automatically include a tenant_id check to prevent cross-tenant data leakage
3. **Policy Comments**: Each policy includes a comment for better documentation and auditing
4. **Idempotent Application**: Policies are dropped and recreated to ensure changes are applied
5. **Migration Tracking**: RLS policies are tracked in a separate migration table to avoid reapplying them

---

## Testing

Integration tests verify that RLS policies are correctly applied and enforced:

```ts
// src/infra/integration-tests/projection.integration.test.ts
describe('RLS Integration Tests', () => {
  // Test cases:
  
  test('Tester can only read their own records', async () => {
    // Set JWT claims for tester role
    await testPool.query(sql`
      SELECT set_config(
        'request.jwt.claims',
        ${JSON.stringify({ user_id: testerId1, tenant_id: tenantId, role: 'tester' })},
        false
      )
    `);
    
    // Query system_status table
    const result = await testPool.query(sql`SELECT * FROM system_status WHERE "testerId" IN (${testerId1}, ${testerId2})`);
    
    // Tester should only see their own records
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].testerId).toBe(testerId1);
  });
  
  test('Developer can read all records within their tenant', async () => {
    // Set JWT claims for developer role
    // ...
    
    // Developer should see all records within their tenant
    expect(result.rows.length).toBe(2);
    expect(result.rows.map(row => row.testerId).sort()).toEqual([testerId1, testerId2].sort());
    expect(result.rows.every(row => row.tenant_id === tenantId)).toBe(true);
  });
  
  test('Developer can only read records from their own tenant', async () => {
    // ...
    
    // Developer should only see records from their own tenant
    expect(result.rows.length).toBe(2);
    expect(result.rows.every(row => row.tenant_id === tenantId)).toBe(true);
    expect(result.rows.every(row => row.tenant_id !== tenantId2)).toBe(true);
  });
});
```

---

## Consequences

### Positive

1. **Security at the Database Level**: Access control is enforced at the database level, providing an additional layer of security
2. **Declarative Policies**: Access policies are defined declaratively in the domain layer, close to the read models they protect
3. **Automatic Generation**: RLS policies are automatically generated and applied during migrations
4. **Tenant Isolation**: Multi-tenant data isolation is enforced by default
5. **Role-Based Access Control**: Different user roles have different access levels to the same data
6. **Auditable**: Policy comments provide documentation for auditing purposes

### Negative

1. **Performance Overhead**: RLS adds some performance overhead to queries
   - This can be mitigated by using appropriate indexes and query optimizations
2. **Complexity**: The system is more complex with multiple layers of access control
3. **Debugging Challenges**: Issues with RLS policies can be harder to debug
4. **Limited to PostgreSQL**: This approach is specific to PostgreSQL and would need adaptation for other databases

---

## Future Considerations

1. **Policy Versioning**: Consider versioning policies to track changes over time
2. **Dynamic Policy Application**: Allow policies to be updated without requiring a full migration
3. **Policy Testing Framework**: Develop a more comprehensive testing framework for policies
4. **Policy Documentation**: Generate documentation from policies for better visibility

---

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Claims in PostgreSQL](https://www.postgresql.org/docs/current/functions-json.html)
- [Umzug Migration Framework](https://github.com/sequelize/umzug)