#!/usr/bin/env ts-node
"use strict";
/**
 * Projection Schema Drift Checker
 * Adds --out to dump a JSON report (consumed by repair-projection-drift)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_pool_1 = require("../../infra/projections/pg-pool");
const glob_1 = require("glob");
const slonik_1 = require("slonik");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
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
/**
 * Dynamically find all projection files and extract their metadata
 * @returns Array of projection metadata objects
 */
async function findProjectionMetadata() {
    const metadata = [];
    // Find all projection files using glob
    const projectionFiles = (0, glob_1.globSync)('src/core/**/read-models/*.projection.ts');
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
                // Check if the metadata uses the new multi-table format
                if (projMeta.tables) {
                    // New format with tables array
                    metadata.push({
                        name: fileName,
                        tables: projMeta.tables,
                        projectionFile: projFile
                    });
                    console.log(`Found multi-table projection metadata for ${fileName} with ${projMeta.tables.length} tables`);
                }
                else if (projMeta.table && projMeta.columnTypes) {
                    // Legacy format with single table
                    metadata.push({
                        name: fileName,
                        tables: [{
                                name: projMeta.table,
                                columnTypes: projMeta.columnTypes
                            }],
                        projectionFile: projFile
                    });
                    console.log(`Found legacy projection metadata for ${fileName} (single table: ${projMeta.table})`);
                }
                else {
                    console.warn(`Invalid metadata format for ${fileName}, skipping. Metadata should have either 'tables' array or 'table' and 'columnTypes'.`);
                }
            }
            else {
                console.warn(`No metadata found for ${fileName}, skipping. Please add a ${metaExportName} export with tables and columnTypes.`);
                // We can't proceed without metadata
            }
        }
        catch (error) {
            console.error(`Error processing projection file ${projFile}:`, error);
        }
    }
    return metadata;
}
async function getTableColumns(table, pool) {
    const result = await pool.query((0, slonik_1.sql) `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = ${table}
    `);
    return result.rows.map((r) => ({ column: r.column_name, type: r.data_type }));
}
function compareColumns(actual, meta) {
    const issues = [];
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
function isTypeCompatible(expectedType, actualType) {
    // Normalize types for comparison
    const normalizedExpected = normalizeType(expectedType);
    const normalizedActual = normalizeType(actualType);
    return normalizedExpected === normalizedActual;
}
// Helper function to normalize types
function normalizeType(type) {
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
function checkFieldDrift(expected, actual) {
    const issues = [];
    // Create maps for case-insensitive and underscore-normalized comparisons
    const normalizedExpected = new Map();
    const normalizedActual = new Map();
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
function normalizeFieldName(name) {
    // Convert to lowercase and remove underscores
    return name.toLowerCase().replace(/_/g, '');
}
async function main() {
    const pool = (0, pg_pool_1.createPool)();
    const metas = await findProjectionMetadata();
    const report = [];
    let foundDrift = false;
    for (const meta of metas) {
        const projectionEntry = {
            projection: meta.name,
            tables: []
        };
        // Check each table in the projection
        for (const table of meta.tables) {
            const actual = await getTableColumns(table.name, pool);
            if (!actual.length) {
                const msg = `Table '${table.name}' does not exist in DB`;
                projectionEntry.tables.push({
                    projection: meta.name,
                    table: table.name,
                    issues: [msg]
                });
                console.warn('[DRIFT]', msg);
                foundDrift = true;
                continue;
            }
            // Compare the actual columns with the expected columns
            const issues = compareColumns(actual, table);
            if (issues.length)
                foundDrift = true;
            projectionEntry.tables.push({
                projection: meta.name,
                table: table.name,
                issues
            });
        }
        report.push(projectionEntry);
    }
    await pool.end();
    /* ----- output ------------------------------------------------------ */
    if (outFile) {
        fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
        console.log(`Drift report written to ${outFile}`);
    }
    else {
        // pretty console output
        for (const projection of report) {
            let hasIssues = false;
            // Check if any table has issues
            for (const tableEntry of projection.tables) {
                if (tableEntry.issues.length > 0) {
                    hasIssues = true;
                    console.log(`\n[DRIFT] ${projection.projection} (${tableEntry.table})`);
                    tableEntry.issues.forEach(i => console.log('  ' + i));
                }
            }
            // If no issues, print OK message
            if (!hasIssues) {
                console.log(`[OK] ${projection.projection} matches (${projection.tables.length} tables)`);
            }
        }
    }
    // exit status
    if (foundDrift && !outFile)
        process.exit(1);
    else
        process.exit(0);
}
if (require.main === module)
    main();
//# sourceMappingURL=index.js.map