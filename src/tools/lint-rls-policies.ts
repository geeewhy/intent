#!/usr/bin/env ts-node
/**
 * RLS Policy Linter
 * 
 * This tool validates the structure, completeness, and correctness of all
 * ReadAccessPolicy definitions across domain read models.
 * 
 * Run with: npm run lint:rls
 * Run with fix mode: npm run lint:rls -- --fix
 */

import { globSync } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

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
  filePath?: string;
  fixable?: boolean;
}

/**
 * Interface for a fix that can be applied to a policy
 */
interface PolicyFix {
  filePath: string;
  scope: string;
  issueType: string;
  originalCode: string;
  fixedCode: string;
  description: string;
}

/**
 * Generate a fix for a missing tenant_id check
 * @param filePath Path to the file containing the policy
 * @param scope Scope name of the policy
 * @param sqlResult Current SQL result from the policy
 * @returns A PolicyFix object with the original and fixed code
 */
function generateTenantIdCheckFix(filePath: string, scope: string, sqlResult: string): PolicyFix {
  const currentSql = sqlResult.trim();
  const fixedSql = `${currentSql} AND current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;

  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Find the policy definition for the given scope
  const policyRegex = new RegExp(`\\[.*${scope}.*\\]\\s*:\\s*\\{[\\s\\S]*?enforcement\\s*:\\s*\\{[\\s\\S]*?sql\\s*:\\s*\\(\\)\\s*=>\\s*\`([\\s\\S]*?)\``, 'g');
  const match = policyRegex.exec(fileContent);

  if (!match) {
    throw new Error(`Could not find policy definition for scope ${scope} in file ${filePath}`);
  }

  const originalCode = match[1];
  const fixedCode = fixedSql;

  return {
    filePath,
    scope,
    issueType: 'missing_tenant_id_check',
    originalCode,
    fixedCode,
    description: `Add tenant_id check to policy ${scope}`
  };
}

/**
 * Generate a fix for an incorrect table name
 * @param filePath Path to the file containing the policy
 * @param scope Scope name of the policy
 * @param incorrectTable Current incorrect table name
 * @param correctTable Correct table name
 * @returns A PolicyFix object with the original and fixed code
 */
function generateTableNameFix(filePath: string, scope: string, incorrectTable: string, correctTable: string): PolicyFix {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Find the table definition for the given scope
  // This is a simpler approach that just looks for the table line directly
  const tableLineRegex = new RegExp(`table:\\s*['"]${incorrectTable}['"]`, 'g');
  const match = tableLineRegex.exec(fileContent);

  if (!match) {
    throw new Error(`Could not find table definition for scope ${scope} in file ${filePath}`);
  }

  const originalCode = match[0];
  const fixedCode = originalCode.replace(incorrectTable, correctTable);

  return {
    filePath,
    scope,
    issueType: 'incorrect_table_name',
    originalCode,
    fixedCode,
    description: `Fix table name for policy ${scope} from '${incorrectTable}' to '${correctTable}'`
  };
}

/**
 * Find projection files and migration files in the same directory as the read-access.ts file
 * and extract table names from them
 */
function findProjectionTables(readAccessFilePath: string): Map<string, string> {
  const tableMap = new Map<string, string>();
  const dirPath = path.dirname(readAccessFilePath);

  // Find all projection files in the same directory
  const projectionFiles = globSync(`${dirPath}/*.projection.ts`);

  for (const projFile of projectionFiles) {
    try {
      // Read the file content
      const content = fs.readFileSync(projFile, 'utf8');

      // Look for table name in SQL statements or table references
      // This is a simple regex-based approach and might need refinement
      // for more complex projection files
      const tableMatches = content.match(/CREATE TABLE (\w+)|table: ['"](\w+)['"]/g);

      if (tableMatches) {
        for (const match of tableMatches) {
          // Extract table name from the match
          const tableName = match.match(/CREATE TABLE (\w+)/)?.[1] || 
                           match.match(/table: ['"](\w+)['"]/)?.[1];

          if (tableName) {
            // Use the filename (without extension) as the key
            const fileName = path.basename(projFile, '.projection.ts');
            tableMap.set(fileName, tableName);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing projection file ${projFile}:`, error);
    }
  }

  // Also check migration files for table names
  const migrationDir = path.join(dirPath, 'migrations');
  if (fs.existsSync(migrationDir)) {
    const migrationFiles = globSync(`${migrationDir}/*.sql`);

    for (const migFile of migrationFiles) {
      try {
        // Read the file content
        const content = fs.readFileSync(migFile, 'utf8');

        // Look for CREATE TABLE statements
        const createTableMatches = content.match(/CREATE TABLE (?:IF NOT EXISTS )?([\w"]+)/g);

        if (createTableMatches) {
          for (const match of createTableMatches) {
            // Extract table name from the match
            const tableNameMatch = match.match(/CREATE TABLE (?:IF NOT EXISTS )?([\w"]+)/);
            if (tableNameMatch && tableNameMatch[1]) {
              let tableName = tableNameMatch[1];
              // Remove quotes if present
              tableName = tableName.replace(/"/g, '');

              // Use the filename (without extension) as the key
              const fileName = path.basename(migFile, '.sql').replace(/^\d+_init_/, '');
              tableMap.set(fileName, tableName);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing migration file ${migFile}:`, error);
      }
    }
  }

  return tableMap;
}

/**
 * Main function to lint RLS policies
 * @param fixMode Whether to generate fixes for issues
 */
async function lintRlsPolicies(fixMode: boolean = false): Promise<boolean> {
  console.log('🔍 RLS Policy Linter');
  console.log('====================\n');

  if (fixMode) {
    console.log('Running in FIX mode - will generate patch-ready fixes\n');
  }

  const issues: LintIssue[] = [];
  const fixes: PolicyFix[] = [];
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

      // Clear require cache to avoid pollution
      delete require.cache[require.resolve(modulePath)];
      const module = require(modulePath);

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

      // Find projection tables in the same directory
      const projectionTables = findProjectionTables(filePath);
      console.log(`Found ${projectionTables.size} projection tables in ${path.dirname(filePath)}`);

      const readModelPolicies = module.ReadModelPolicies as Record<string, ReadAccessPolicy>;

      // Process each policy
      for (const [scopeName, policy] of Object.entries(readModelPolicies)) {
        // Add to used scopes
        usedScopes.add(scopeName);

        // Check if policy.table exists and is valid
        if (!policy.table || typeof policy.table !== 'string') {
          issues.push({
            type: 'error',
            message: `Missing or invalid 'table' in policy: ${scopeName}`,
            scope: scopeName,
          });
          continue;
        }

        // Verify table name against projection files
        // This is a best-effort validation and may not catch all issues
        if (projectionTables.size > 0) {
          // Check if any projection file defines this table
          const tableFound = Array.from(projectionTables.values()).includes(policy.table);

          if (!tableFound) {
            // Try to find a similar table name
            const similarTableNames = Array.from(projectionTables.values()).filter(tableName => 
              tableName.toLowerCase().includes(policy.table.toLowerCase().replace(/x$/, '')) ||
              policy.table.toLowerCase().includes(tableName.toLowerCase())
            );

            const correctTableName = similarTableNames.length === 1 ? similarTableNames[0] : undefined;

            const issue: LintIssue = {
              type: 'warning',
              message: `Table '${policy.table}' in policy '${scopeName}' not found in any projection file`,
              scope: scopeName,
              table: policy.table,
              filePath,
              fixable: !!correctTableName
            };

            if (correctTableName && fixMode) {
              try {
                const fix = generateTableNameFix(filePath, scopeName, policy.table, correctTableName);
                fixes.push(fix);
                issue.suggestion = `Consider changing to '${correctTableName}'`;
              } catch (error) {
                console.error(`Error generating fix for table name: ${error}`);
              }
            }

            issues.push(issue);
          }
        }

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

        // Check if sql() returns an empty string, handling null/undefined
        const sqlResult = policy.enforcement.sql?.() ?? '';
        if (sqlResult.trim() === '') {
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

          const issue: LintIssue = {
            type: 'error',
            message: `Policy '${scopeName}' missing tenant_id restriction`,
            scope: scopeName,
            table: policy.table,
            suggestion,
            filePath,
            fixable: true
          };

          if (fixMode) {
            try {
              const fix = generateTenantIdCheckFix(filePath, scopeName, sqlResult);
              fixes.push(fix);
            } catch (error) {
              console.error(`Error generating fix for tenant_id check: ${error}`);
              issue.fixable = false;
            }
          }

          issues.push(issue);
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

    // If in fix mode and there are fixes, output them
    if (fixMode && fixes.length > 0) {
      console.log('\n🔧 Generated fixes:');
      console.log(formatFixesAsPatch(fixes));
      console.log('\nTo apply these fixes, you can manually edit the files or use a patch tool.');
    }

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
 * Format fixes as a patch that can be applied to the code
 * @param fixes Array of PolicyFix objects
 * @returns A string containing the patch
 */
function formatFixesAsPatch(fixes: PolicyFix[]): string {
  if (fixes.length === 0) {
    return 'No fixes to apply';
  }

  // Group fixes by file
  const fixesByFile: Record<string, PolicyFix[]> = {};
  for (const fix of fixes) {
    if (!fixesByFile[fix.filePath]) {
      fixesByFile[fix.filePath] = [];
    }
    fixesByFile[fix.filePath].push(fix);
  }

  let patch = '';

  // Generate patch for each file
  for (const [filePath, fileFixes] of Object.entries(fixesByFile)) {
    patch += `\n--- ${filePath}\n+++ ${filePath}\n\n`;

    for (const fix of fileFixes) {
      patch += `@@ ${fix.description} @@\n`;
      patch += `- ${fix.originalCode.trim()}\n`;
      patch += `+ ${fix.fixedCode.trim()}\n\n`;
    }
  }

  return patch;
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
  // Check if --fix flag is present
  const fixMode = process.argv.includes('--fix');

  lintRlsPolicies(fixMode)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Linter failed with error:', error);
      process.exit(1);
    });
}

export { lintRlsPolicies };
