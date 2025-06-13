#!/usr/bin/env ts-node
"use strict";
// RLS policy linter
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.lintRlsPolicies = main;
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
var IssueKind;
(function (IssueKind) {
    IssueKind["Error"] = "error";
    IssueKind["Warn"] = "warning";
})(IssueKind || (IssueKind = {}));
// --- constants -----------------------------------------------
const READ_GLOB = 'src/core/**/read-models/read-access.ts';
const TENANT_SQL = `current_setting('request.jwt.claims', true)::json->>'tenant_id' = tenant_id::text`;
const cache = new Map();
// --- helpers --------------------------------------------------
const read = (f) => fs_1.default.readFileSync(f, 'utf8');
const list = () => (0, glob_1.globSync)(READ_GLOB);
function projTables(dir) {
    if (cache.has(dir))
        return cache.get(dir);
    const tbl = new Map();
    (0, glob_1.globSync)(`${dir}/*.projection.ts`).forEach(f => {
        // Try to extract table names from the new multi-table format
        const content = read(f);
        // Check for the new tables array format
        const tablesMatch = content.match(/tables:\s*\[\s*{\s*name:\s*['"](\w+)['"]/g);
        if (tablesMatch) {
            // Extract table names from the tables array
            tablesMatch.forEach(m => {
                const t = /name:\s*['"](\w+)['"]/.exec(m)?.[1];
                if (t)
                    tbl.set(path_1.default.basename(f, '.projection.ts'), t);
            });
        }
        else {
            // Fall back to the old format
            (content.match(/CREATE TABLE (\w+)|table: ['"](\w+)['"]/g) || [])
                .forEach(m => {
                const t = /CREATE TABLE (\w+)/.exec(m)?.[1] ?? /table: ['"](\w+)['"]/.exec(m)?.[1];
                if (t)
                    tbl.set(path_1.default.basename(f, '.projection.ts'), t);
            });
        }
    });
    const migDir = path_1.default.join(dir, 'migrations');
    if (fs_1.default.existsSync(migDir))
        (0, glob_1.globSync)(`${migDir}/*.sql`).forEach(f => (read(f).match(/CREATE TABLE (?:IF NOT EXISTS )?([\w"]+)/g) || [])
            .forEach(m => {
            const t = /CREATE TABLE (?:IF NOT EXISTS )?([\w"]+)/.exec(m)?.[1]?.replace(/"/g, '');
            if (t)
                tbl.set(path_1.default.basename(f, '.sql').replace(/^\d+_init_/, ''), t);
        }));
    cache.set(dir, tbl);
    return tbl;
}
const hasTenant = (sql) => /tenant_id/.test(sql);
// minimal Levenshtein
const dist = (a, b) => {
    if (a === b)
        return 0;
    const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; ++i)
        d[i][0] = i;
    for (let j = 0; j <= b.length; ++j)
        d[0][j] = j;
    for (let i = 1; i <= a.length; ++i)
        for (let j = 1; j <= b.length; ++j)
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
};
const closest = (t, opts) => opts.sort((a, b) => dist(t, a) - dist(t, b))[0];
// --- patch formatter -----------------------------------------
const patch = (fx) => fx.length
    ? Object.entries(fx.reduce((m, f) => { var _a; return ((m[_a = f.filePath] ?? (m[_a] = [])).push(f), m); }, {}))
        .map(([file, arr]) => [`--- ${file}`, `+++ ${file}`, '']
        .concat(arr.flatMap(f => [
        `@@ ${f.description} @@`,
        `- ${f.originalCode.trim()}`,
        `+ ${f.fixedCode.trim()}`,
        ''
    ]))
        .join('\n'))
        .join('\n')
    : 'No fixes to apply';
// --- fix generators ------------------------------------------
function tenantFix(file, scope, sql) {
    const src = read(file);
    // try to capture the template-string inside enforcement.sql
    const blockRe = new RegExp(`${scope}[\\s\\S]*?enforcement[\\s\\S]*?sql[\\s\\S]*?=>\\s*\\\`([\\s\\S]*?)\\\``);
    const m = blockRe.exec(src);
    if (!m)
        return null;
    return {
        filePath: file,
        scope,
        issueType: 'missing_tenant',
        originalCode: m[1],
        fixedCode: `${m[1].trim()} AND ${TENANT_SQL}`,
        description: `add tenant_id check`
    };
}
function tableFix(file, scope, bad, good) {
    const src = read(file);
    const line = new RegExp(`table:\\s*['"]${bad}['"]`).exec(src);
    if (!line)
        return null;
    return {
        filePath: file,
        scope,
        issueType: 'wrong_table',
        originalCode: line[0],
        fixedCode: `table: '${good}'`,
        description: `rename table ${bad}→${good}`
    };
}
const chk = {
    basics({ scope, policy, issues }) {
        if (!policy.table)
            issues.push({ type: IssueKind.Error, message: `missing table in ${scope}` });
        if (!policy.enforcement?.sql)
            issues.push({ type: IssueKind.Error, message: `missing sql in ${scope}` });
    },
    table({ scope, policy, proj, issues, fixes, fix, file }) {
        if (!proj.size || [...proj.values()].includes(policy.table))
            return;
        const best = closest(policy.table, [...proj.values()]);
        issues.push({
            type: IssueKind.Warn,
            message: `unknown table '${policy.table}' in ${scope}`,
            scope,
            fixable: !!best,
            suggestion: best ? `rename to '${best}'` : undefined
        });
        if (fix && best) {
            const fx = tableFix(file, scope, policy.table, best);
            if (fx)
                fixes.push(fx);
        }
    },
    tenant({ scope, policy, issues, fixes, fix, file }) {
        const sql = policy.enforcement?.sql?.() ?? '';
        if (!sql || hasTenant(sql))
            return;
        issues.push({
            type: IssueKind.Error,
            message: `tenant check missing in ${scope}`,
            scope,
            fixable: true
        });
        if (fix) {
            const fx = tenantFix(file, scope, sql);
            if (fx)
                fixes.push(fx);
        }
    }
};
// --- main -----------------------------------------------------
async function main() {
    const fix = process.argv.includes('--fix');
    const issues = [];
    const fixes = [];
    const declared = new Set();
    const used = new Set();
    const dupCond = new Set();
    for (const file of list()) {
        const modPath = path_1.default.resolve(file);
        delete require.cache[require.resolve(modPath)];
        const mod = require(modPath);
        Object.values(mod).forEach(v => typeof v === 'string'
            ? declared.add(v)
            : typeof v === 'object' && v &&
                Object.values(v).forEach(s => typeof s === 'string' && declared.add(s)));
        const policies = mod.ReadModelPolicies ?? {};
        const proj = projTables(path_1.default.dirname(file));
        for (const [scope, policy] of Object.entries(policies)) {
            used.add(scope);
            const ctx = { scope, policy, file, proj, issues, fixes, fix };
            chk.basics(ctx);
            chk.table(ctx);
            chk.tenant(ctx);
            // duplicates & mismatch
            if (dupCond.has(policy.condition))
                issues.push({ type: IssueKind.Warn, message: `duplicate condition '${policy.condition}'` });
            else
                dupCond.add(policy.condition);
            if (policy.condition !== scope)
                issues.push({
                    type: IssueKind.Warn,
                    message: `condition '${policy.condition}' differs from key '${scope}'`
                });
        }
    }
    declared.forEach(s => !used.has(s) && issues.push({ type: IssueKind.Warn, message: `unused scope '${s}'` }));
    // --- report ------------
    const errors = issues.filter(i => i.type === IssueKind.Error);
    const warns = issues.filter(i => i.type === IssueKind.Warn);
    console.log(`${errors.length} errors / ${warns.length} warnings`);
    errors.forEach(e => console.log('error:', e.message));
    warns.forEach(w => console.log('warn :', w.message));
    if (fix && fixes.length) {
        console.log('\nfixes:\n');
        console.log(patch(fixes));
    }
    return !errors.length;
}
// Support programmatic execution
if (require.main === module) {
    main()
        .then(ok => process.exit(ok ? 0 : 1))
        .catch(err => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map