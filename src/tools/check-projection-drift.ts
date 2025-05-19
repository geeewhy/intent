#!/usr/bin/env ts-node

/**
 * Projection Schema Drift Checker
 *
 * Validates that the expected columns in each projection match the actual table schema in Postgres.
 * Run: npm run check:projection-drift
 */

import { createPool } from '../infra/projections/pg-pool';
import { loadAllProjections } from '../infra/projections/loadProjections';
import * as path from 'path';
import { sql } from 'slonik';
import * as dotenv from 'dotenv';
import { globSync } from 'glob';

dotenv.config();

// Interface for projection metadata
interface ProjectionMetadata {
  name: string;
  table: string;
  columnTypes: Record<string, string>;
  projectionFile: string;
}

/**
 * Dynamically find all projection files and extract their metadata
 * @returns Array of projection metadata objects
 */
async function findProjectionMetadata(): Promise<ProjectionMetadata[]> {
  const metadata: ProjectionMetadata[] = [];

  // Find all projection files using glob
  const projectionFiles = globSync('src/core/**/read-models/*.projection.ts');

  // Skip test files
  const nonTestFiles = projectionFiles.filter(file => !file.includes('__tests__'));

  console.log(`Found ${nonTestFiles.length} projection file(s)`);

  for (const projFile of nonTestFiles) {
    try {
      // Get the projection name from the file name
      const fileName = path.basename(projFile, '.projection.ts');

      // Import the projection file
      const fullPath = path.resolve(process.cwd(), projFile);

      // Clear require cache to ensure we get the latest version
      delete require.cache[require.resolve(fullPath)];
      const projectionModule = require(fullPath);

      // Look for a metadata export with the pattern: {camelCaseName}ProjectionMeta
      const metaExportName = `projectionMeta`;

      if (projectionModule[metaExportName]) {
        // If the file exports metadata, use it
        const projMeta = projectionModule[metaExportName];

        metadata.push({
          name: fileName,
          table: projMeta.table,
          columnTypes: projMeta.columnTypes,
          projectionFile: projFile
        });

        console.log(`Found projection metadata for ${fileName}`);
      } else {
        console.warn(`No metadata found for ${fileName}, skipping. Please add a ${metaExportName} export with table and columnTypes.`);
        // We can't proceed without columnTypes
      }
    } catch (error) {
      console.error(`Error processing projection file ${projFile}:`, error);
    }
  }

  return metadata;
}

async function getTableColumns(table: string, pool: any) {
  const result = await pool.query(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = ${table}
  `);
  return result.rows.map((r: any) => ({ column: r.column_name, type: r.data_type }));
}

function compareColumns(actual: {column: string, type: string}[], meta: any) {
  const issues: string[] = [];
  const actualCols = actual.map(a => a.column);

  // Extract expected columns from columnTypes
  const expected = Object.keys(meta.columnTypes);

  // Missing columns
  for (const col of expected) {
    if (!actualCols.includes(col)) {
      issues.push(`❌ Missing in table: '${col}'`);
    }
  }

  // Extra columns
  for (const { column } of actual) {
    if (!expected.includes(column)) {
      issues.push(`⚠️ Present in table but not projected: '${column}'`);
    }
  }

  // Type mismatches
  for (const { column, type } of actual) {
    if (expected.includes(column)) {
      const expectedType = meta.columnTypes[column];
      // Check for type mismatches
      if (!isTypeCompatible(expectedType, type)) {
        issues.push(`❌ Type mismatch: '${column}' is '${type}' in DB but expected '${expectedType}'`);
      }
    }
  }

  // Field drift (case/underscore inconsistencies)
  const fieldDriftIssues = checkFieldDrift(expected, actualCols);
  issues.push(...fieldDriftIssues);

  return issues;
}

// Helper function to check if types are compatible
function isTypeCompatible(expectedType: string, actualType: string): boolean {
  // Normalize types for comparison
  const normalizedExpected = normalizeType(expectedType);
  const normalizedActual = normalizeType(actualType);

  return normalizedExpected === normalizedActual;
}

// Helper function to normalize types
function normalizeType(type: string): string {
  // Map JavaScript/TypeScript types to PostgreSQL types
  switch (type.toLowerCase()) {
    case 'string':
    case 'text':
    case 'character varying':
    case 'varchar':
      return 'text';
    case 'number':
    case 'integer':
    case 'int':
    case 'int4':
      return 'integer';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'date':
    case 'timestamp':
    case 'timestamptz':
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      return 'timestamp';
    case 'object':
    case 'json':
    case 'jsonb':
      return 'jsonb';
    case 'uuid':
      return 'uuid';
    default:
      return type.toLowerCase();
  }
}

// Helper function to check for field drift (case/underscore inconsistencies)
function checkFieldDrift(expected: string[], actual: string[]): string[] {
  const issues: string[] = [];

  // Create maps for case-insensitive and underscore-normalized comparisons
  const normalizedExpected = new Map<string, string>();
  const normalizedActual = new Map<string, string>();

  // Normalize expected columns
  for (const col of expected) {
    const normalized = normalizeFieldName(col);
    normalizedExpected.set(normalized, col);
  }

  // Normalize actual columns
  for (const col of actual) {
    const normalized = normalizeFieldName(col);
    normalizedActual.set(normalized, col);
  }

  // Check for case/underscore inconsistencies
  for (const [normalized, originalExpected] of normalizedExpected.entries()) {
    const originalActual = normalizedActual.get(normalized);
    if (originalActual && originalActual !== originalExpected) {
      issues.push(`⚠️ Field drift: '${originalExpected}' in code vs '${originalActual}' in DB`);
    }
  }

  return issues;
}

// Helper function to normalize field names for comparison
function normalizeFieldName(name: string): string {
  // Convert to lowercase and remove underscores
  return name.toLowerCase().replace(/_/g, '');
}

// Enum check removed as it was relying on previously inserted data which may not be there

export async function checkProjectionSchemaDrift() {
  const pool = createPool();

  let foundDrift = false;

  // Dynamically find all projection metadata
  const projectionMetadata = await findProjectionMetadata();

  if (projectionMetadata.length === 0) {
    console.warn('[DRIFT] No projection files found');
    return;
  }

  console.log(`Found ${projectionMetadata.length} projection(s) to check\n`);

  for (const meta of projectionMetadata) {
    // Fetch actual table schema
    const actualCols = await getTableColumns(meta.table, pool);
    if (actualCols.length === 0) {
      console.warn(`[DRIFT] Table '${meta.table}' does not exist in DB`);
      foundDrift = true;
      continue;
    }

    // Compare
    const issues = compareColumns(actualCols, meta);

    if (issues.length > 0) {
      foundDrift = true;
      console.log(`\n[DRIFT] Projection '${meta.name}' (table '${meta.table}'):\n${issues.map(i => '  ' + i).join('\n')}`);
    } else {
      console.log(`[OK] Projection '${meta.name}' matches table '${meta.table}'`);
    }

    // Enum check removed as it was relying on previously inserted data which may not be there
  }

  await pool.end();

  if (foundDrift) {
    console.log('\n❌ Projection schema drift detected');
    process.exit(1);
  } else {
    console.log('\n✅ No schema drift detected. All projections match DB tables.');
  }
}

if (require.main === module) {
  checkProjectionSchemaDrift();
}
