#!/usr/bin/env ts-node
/**
 * Projection Schema Drift Checker
 * Adds --out to dump a JSON report (consumed by repair-projection-drift)
 */

import {createPool} from '../../infra/projections/pg-pool';
import {globSync} from 'glob';
import {sql} from 'slonik';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

/* ---------- CLI parsing ---------------------------------------------- */
const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const outFile = outIndex !== -1 ? argv[outIndex + 1] : undefined;
const wantHelp = argv.includes('--help') || argv.includes('-h');

if (wantHelp) {
    console.log(`
check:projection-drift  –  detects schema drift

Usage:
  npm run check:projection-drift [--out drift.json]

Flags:
  --out <file>   Write drift report as JSON
  --help, -h     Show this help
`);
    process.exit(0);
}

/* ---------- helpers (same compare logic as before, omitted-for-brevity) */


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
    return result.rows.map((r: any) => ({column: r.column_name, type: r.data_type}));
}

function compareColumns(actual: { column: string, type: string }[], meta: any) {
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
    for (const {column} of actual) {
        if (!expected.includes(column)) {
            issues.push(`⚠️ Present in table but not projected: '${column}'`);
        }
    }

    // Type mismatches
    for (const {column, type} of actual) {
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

/* ---------- main ------------------------------------------------------ */
interface DriftEntry {
    projection: string;
    table: string;
    issues: string[];
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

async function main() {
    const pool = createPool();
    const metas = await findProjectionMetadata();
    const report: DriftEntry[] = [];
    let foundDrift = false;

    for (const meta of metas) {
        const actual = await getTableColumns(meta.table, pool);
        if (!actual.length) {
            const msg = `Table '${meta.table}' does not exist in DB`;
            report.push({projection: meta.name, table: meta.table, issues: [msg]});
            console.warn('[DRIFT]', msg);
            foundDrift = true;
            continue;
        }
        const issues = compareColumns(actual, meta);
        if (issues.length) foundDrift = true;
        report.push({projection: meta.name, table: meta.table, issues});
    }
    await pool.end();

    /* ----- output ------------------------------------------------------ */
    if (outFile) {
        fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
        console.log(`Drift report written to ${outFile}`);
    } else {
        // pretty console output
        for (const e of report) {
            if (e.issues.length) {
                console.log(`\n[DRIFT] ${e.projection} (${e.table})`);
                e.issues.forEach(i => console.log('  ' + i));
            } else {
                console.log(`[OK] ${e.projection} matches`);
            }
        }
    }

    // exit status
    if (foundDrift && !outFile) process.exit(1);
    else process.exit(0);
}

if (require.main === module) main();
