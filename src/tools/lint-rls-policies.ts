#!/usr/bin/env ts-node
/**
 * RLS Policy Linter
 * 
 * This tool validates the structure, completeness, and correctness of all
 * ReadAccessPolicy definitions across domain read models.
 * 
 * Run with: npm run lint:rls
 */

import { globSync } from 'glob';
import * as path from 'path';
import * as fs from 'fs';

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

interface LintIssue {
  type: 'error' | 'warning';
  message: string;
  scope?: string;
  table?: string;
  suggestion?: string;
}

/**
 * Main function to lint RLS policies
 */
async function lintRlsPolicies(): Promise<boolean> {
  console.log('🔍 RLS Policy Linter');
  console.log('====================\n');

  const issues: LintIssue[] = [];
  const allPolicies: { [key: string]: ReadAccessPolicy } = {};
  const allScopes: Set<string> = new Set();
  const usedScopes: Set<string> = new Set();

  // Find all read-access.ts files
  const readAccessFiles = globSync('src/core/**/read-models/read-access.ts');

  console.log(`Found ${readAccessFiles.length} read-access files\n`);

  for (const filePath of readAccessFiles) {
    try {
      // Dynamically import the read-access.ts file
      const modulePath = path.resolve(process.cwd(), filePath);
      const module = await import(modulePath);

      // Check if the module exports ReadModelPolicies
      if (!module.ReadModelPolicies) {
        console.log(`⚠️ No ReadModelPolicies found in ${filePath}, skipping`);
        continue;
      }

      // Check if the module exports SystemReadModelScopes or similar
      const scopesExport = findScopesExport(module);
      if (scopesExport) {
        // Add all scopes to the allScopes set
        Object.values(scopesExport).forEach(scope => {
          if (typeof scope === 'string') {
            allScopes.add(scope);
          }
        });
      }

      const readModelPolicies = module.ReadModelPolicies as Record<string, ReadAccessPolicy>;

      // Process each policy
      for (const [scopeName, policy] of Object.entries(readModelPolicies)) {
        // Add to used scopes
        usedScopes.add(scopeName);

        // Check for duplicate conditions
        if (allPolicies[policy.condition]) {
          issues.push({
            type: 'warning',
            message: `Duplicate policy condition: '${policy.condition}' used in multiple policies`,
            scope: scopeName,
            table: policy.table
          });
        }

        allPolicies[policy.condition] = policy;

        // Check if policy.condition matches scopeName
        if (policy.condition !== scopeName) {
          issues.push({
            type: 'warning',
            message: `Policy condition mismatch: declared '${policy.condition}', scope key is '${scopeName}'`,
            scope: scopeName,
            table: policy.table
          });
        }

        // Check if policy has enforcement.sql
        if (!policy.enforcement?.sql) {
          issues.push({
            type: 'error',
            message: `Missing enforcement.sql in scope: ${scopeName}`,
            scope: scopeName,
            table: policy.table
          });
          continue;
        }

        // Check if sql() returns an empty string
        const sqlResult = policy.enforcement.sql();
        if (!sqlResult || sqlResult.trim() === '') {
          issues.push({
            type: 'error',
            message: `Empty SQL string returned from enforcement.sql() in scope: ${scopeName}`,
            scope: scopeName,
            table: policy.table
          });
          continue;
        }

        // Check if the SQL includes tenant_id restriction
        const hasTenantCheck = sqlResult.includes("tenant_id") || 
                              sqlResult.includes('"tenant_id"') || 
                              sqlResult.includes("'tenant_id'");

        if (!hasTenantCheck) {
          // Create a suggestion for how to add tenant_id check
          const currentSql = sqlResult.trim();
          const suggestion = `Add tenant_id check like: ${currentSql} AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;

          issues.push({
            type: 'error',
            message: `Policy '${scopeName}' missing tenant_id restriction`,
            scope: scopeName,
            table: policy.table,
            suggestion
          });
        }
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      issues.push({
        type: 'error',
        message: `Failed to process ${filePath}: ${error}`
      });
    }
  }

  // Check for unused scopes
  allScopes.forEach(scope => {
    if (!usedScopes.has(scope)) {
      issues.push({
        type: 'warning',
        message: `Unused scope defined but not used in any policy: ${scope}`,
        scope: scope
      });
    }
  });

  // Print results
  const errors = issues.filter(issue => issue.type === 'error');
  const warnings = issues.filter(issue => issue.type === 'warning');

  if (errors.length > 0 || warnings.length > 0) {
    console.log('❌ RLS Policy Linter Failed:\n');

    if (errors.length > 0) {
      console.log('🔴 Errors:');
      errors.forEach(issue => {
        console.log(`  - ${issue.message}`);
        if (issue.suggestion) {
          console.log(`    ${issue.suggestion}`);
        }
      });
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('🟡 Warnings:');
      warnings.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
      console.log('');
    }

    console.log(`✅ Found ${Object.keys(allPolicies).length} total policies, ${errors.length} errors, ${warnings.length} warnings`);

    // Exit with error code if there are errors
    if (errors.length > 0) {
      return false;
    }
  } else {
    console.log('✅ All RLS policies passed validation!');
    console.log(`Found ${Object.keys(allPolicies).length} total policies`);
  }

  return true;
}

/**
 * Helper function to find the scopes export in a module
 */
function findScopesExport(module: any): Record<string, string> | null {
  // Look for exports that might contain scopes
  const scopeExportNames = Object.keys(module).filter(key => 
    key.endsWith('Scopes') || 
    key.endsWith('ReadModelScopes') || 
    key.endsWith('ModelScopes')
  );

  if (scopeExportNames.length > 0) {
    return module[scopeExportNames[0]];
  }

  return null;
}

// Run the linter if this file is executed directly
if (require.main === module) {
  lintRlsPolicies()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Linter failed with error:', error);
      process.exit(1);
    });
}

export { lintRlsPolicies };
