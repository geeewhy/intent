#!/usr/bin/env ts-node
/**
 * Migration CLI
 * - Supports programmatic and command-line usage
 * - Added --help / -h flag to display options, projections, and tables
 */

import minimist from 'minimist';
import { scanProjections } from './scanner';
import { runMigrations } from './executor';
import { buildPlan }       from './planner';

/**
 * Render help text derived from real project state.
 */
function showHelp() {
    const projections = scanProjections();

    console.log(`
Usage:
  migrations [options]

Options:
  --help, -h                     Show this help text
  --force-rls                    Re-apply every RLS policy (ignores SQL hash)
  --rebuild-from-projection <p>  Drop tables for projection <p>, then migrate
  --rebuild-from-table <t>       Drop table <t>, then migrate

Available projections:`);

    for (const p of projections) {
        console.log(`  • ${p.name}`);
        if (p.tables.length) {
            console.log(`      tables: ${p.tables.join(', ')}`);
        }
    }
    console.log(); // final newline
}

/* ---------- CLI entry -------------------------------------------------- */

const argv = process.argv.slice(2);
const args = minimist(argv, { boolean: ['help', 'h'] });

if (args.help || args.h) {
    showHelp();
    process.exit(0);
}

/* Build plan first to trigger validation (may exit) */
buildPlan(scanProjections(), argv);

runMigrations(argv)
    .then(() => {
        console.log('✅ migrations complete');
    })
    .catch(err => {
        console.error('❌ migrations failed:', err);
        process.exit(1);
    });
