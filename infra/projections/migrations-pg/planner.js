"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlan = buildPlan;
const minimist_1 = __importDefault(require("minimist"));
function buildPlan(all, argv) {
    const args = (0, minimist_1.default)(argv, {
        string: ['rebuild-from-projection', 'rebuild-from-table'],
        boolean: ['force-rls'],
    });
    /* ----- validation helpers ------------------------------------------- */
    const fail = (msg) => {
        console.error(`\n❌ ${msg}\n`);
        console.error('Available projections:', all.map(p => p.name).join(', '));
        console.error('Available tables:', [...new Set(all.flatMap(p => p.tables))].join(', '));
        process.exit(1);
    };
    /* ----- projection rebuild ------------------------------------------- */
    let rebuildProj = [];
    if (args['rebuild-from-projection']) {
        rebuildProj = all.filter(p => p.name === args['rebuild-from-projection']);
        if (rebuildProj.length === 0) {
            fail(`Projection "${args['rebuild-from-projection']}" not found`);
        }
    }
    /* ----- table rebuild ------------------------------------------------ */
    const allTables = all.flatMap(p => p.tables);
    let rebuildTables = [];
    if (args['rebuild-from-table']) {
        const t = args['rebuild-from-table'];
        if (!allTables.includes(t))
            fail(`Table "${t}" not found`);
        rebuildTables = [t];
    }
    /* ----- forceRls auto-enable on rebuild ------------------------------ */
    const forceRls = !!args['force-rls'] || rebuildProj.length > 0 || rebuildTables.length > 0;
    return {
        projections: all,
        forceRls,
        rebuild: { projections: rebuildProj, tables: rebuildTables },
    };
}
//# sourceMappingURL=planner.js.map