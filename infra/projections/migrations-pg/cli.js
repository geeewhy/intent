#!/usr/bin/env ts-node
"use strict";
/**
 * Migration CLI
 * - Supports programmatic and command-line usage
 * - Added --help / -h flag to display options, projections, and tables
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const minimist_1 = __importDefault(require("minimist"));
const scanner_1 = require("./scanner");
const executor_1 = require("./executor");
const planner_1 = require("./planner");
/**
 * Render help text derived from real project state.
 */
function showHelp() {
    const projections = (0, scanner_1.scanProjections)();
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
const args = (0, minimist_1.default)(argv, { boolean: ['help', 'h'] });
if (args.help || args.h) {
    showHelp();
    process.exit(0);
}
/* Build plan first to trigger validation (may exit) */
(0, planner_1.buildPlan)((0, scanner_1.scanProjections)(), argv);
(0, executor_1.runMigrations)(argv)
    .then(() => {
    console.log('✅ migrations complete');
})
    .catch(err => {
    console.error('❌ migrations failed:', err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map