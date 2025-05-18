// src/infra/projections/genRlsSql.ts
import { globSync } from 'glob';
import * as path from 'path';

/**
 * Type definition for ReadAccessPolicy, matching the structure in read-access.ts files
 */
interface ReadAccessPolicy {
  table: string;
  condition: string;
  isAuthorized?: (ctx: any) => boolean;
  enforcement?: {
    sql?: () => string;
    mongo?: (ctx: any) => any;
    redact?: (record: any, ctx: any) => any;
  };
}

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
export async function generateRlsPolicies(): Promise<RlsPolicySql[]> {
  console.log('Generating RLS policy SQL statements...');
  const policies: RlsPolicySql[] = [];

  // Find all read-access.ts files
  const readAccessFiles = globSync('src/core/**/read-models/read-access.ts');

  console.log(`Found ${readAccessFiles.length} read-access files`);

  for (const filePath of readAccessFiles) {
    try {
      // Dynamically import the read-access.ts file
      const modulePath = path.resolve(process.cwd(), filePath);
      const module = await import(modulePath);

      // Check if the module exports ReadModelPolicies
      if (!module.ReadModelPolicies) {
        console.log(`No ReadModelPolicies found in ${filePath}, skipping`);
        continue;
      }

      const readModelPolicies = module.ReadModelPolicies as Record<string, ReadAccessPolicy>;

      // Process each policy
      for (const [scopeName, policy] of Object.entries(readModelPolicies)) {
        if (!policy.table || !policy.enforcement?.sql) {
          console.log(`Policy ${scopeName} is missing table or sql enforcement, skipping`);
          continue;
        }

        // Enable RLS on the table
        const enableRlsQuery = `ALTER TABLE ${policy.table} ENABLE ROW LEVEL SECURITY;`;

        // Generate the policy SQL
        let sqlCondition = policy.enforcement.sql();

        // Add type casting for all ID fields
        // Find JWT claim comparisons (like user_id, tenant_id) and add ::text casting
        // Handle cases where JWT claim is on the left side of the comparison with various operators
        sqlCondition = sqlCondition.replace(
          /current_setting\('request\.jwt\.claims', true\)::json->>'([^']+)'\s*(=|!=|<>|>|<|>=|<=)\s*([^:\s]+)/g,
          "current_setting('request.jwt.claims', true)::json->>'$1' $2 $3::text"
        );

        // Handle cases where JWT claim is on the right side of the comparison with various operators
        sqlCondition = sqlCondition.replace(
          /([^:\s]+)\s*(=|!=|<>|>|<|>=|<=)\s*current_setting\('request\.jwt\.claims', true\)::json->>'([^']+)'/g,
          "$1::text $2 current_setting('request.jwt.claims', true)::json->>'$3'"
        );

        // Find all database fields that are likely to be IDs and add ::text casting if they don't already have it
        // Note: These regexes handle common cases but may not catch all scenarios.
        // For complex expressions or function calls, it's recommended to add explicit type casting
        // in the policy.enforcement.sql() function.

        // Handle regular identifiers ending with _id (like tenant_id, user_id)
        sqlCondition = sqlCondition.replace(
          /(\w+_id)(?!::text)(\s|$|\))/g,
          "$1::text$2"
        );

        // Handle regular identifiers that are exactly 'id'
        sqlCondition = sqlCondition.replace(
          /\bid\b(?!::text)(\s|$|\))/g,
          "id::text$1"
        );

        // Handle quoted identifiers that end with Id (like "testerId", "userId")
        sqlCondition = sqlCondition.replace(
          /("(\w+Id)")(?!::text)(\s|$|\))/g,
          "$1::text$3"
        );

        // Handle quoted identifier that is exactly "id"
        sqlCondition = sqlCondition.replace(
          /("id")(?!::text)(\s|$|\))/g,
          "$1::text$2"
        );

        // Add tenant_id check for multi-tenant tables if not already present
        // This avoids leaking rows across tenants, even if role-based access passes
        const hasTenantCheck = sqlCondition.includes("tenant_id") || 
                              sqlCondition.includes('"tenant_id"') || 
                              sqlCondition.includes("'tenant_id'");

        // Only add tenant check if it's not a globally public policy (doesn't already have tenant check)
        if (!hasTenantCheck) {
          // We'll add the tenant check, assuming the table has a tenant_id column
          // The SQL will fail during execution if the table doesn't have this column, which is expected
          sqlCondition = `${sqlCondition} AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;
        }

        const dropPolicyQuery = `DROP POLICY IF EXISTS "${policy.condition}" ON ${policy.table};`;

        const createPolicyQuery = `
CREATE POLICY "${policy.condition}"
ON ${policy.table}
FOR SELECT
USING (
  ${sqlCondition}
);
        `;

        // Generate comment for the policy
        const commentPolicyQuery = `
COMMENT ON POLICY "${policy.condition}" ON ${policy.table} 
IS 'RLS for ${policy.condition} access';
        `;

        policies.push({
          tableName: policy.table,
          condition: policy.condition,
          enableRlsQuery,
          dropPolicyQuery,
          createPolicyQuery,
          commentPolicyQuery
        });

        console.log(`Generated RLS policy SQL for "${policy.condition}" on table ${policy.table}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  console.log(`Generated ${policies.length} RLS policy SQL statements`);
  return policies;
}
