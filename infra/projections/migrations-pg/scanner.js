"use strict";
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
exports.scanProjections = scanProjections;
const glob_1 = require("glob");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const PROJECTION_GLOB = 'src/core/**/read-models/*.projection.ts';
/** crude “CREATE TABLE …” parser — good enough for migration tracking */
function extractTables(sql) {
    const rx = /create\s+table\s+(?:if\s+not\s+exists\s+)?("?[\w.]+"?)/gi;
    const out = [];
    let m;
    while ((m = rx.exec(sql)))
        out.push(m[1].replace(/"/g, ''));
    return out;
}
function scanProjections() {
    return (0, glob_1.globSync)(PROJECTION_GLOB, { absolute: true }).map(fp => {
        const dir = path.dirname(fp);
        const migrationsDir = path.join(dir, 'migrations');
        const tables = (0, glob_1.globSync)(`${migrationsDir}/*.sql`, { absolute: true })
            .flatMap(f => extractTables(fs.readFileSync(f, 'utf8')));
        return {
            name: path.basename(fp, '.projection.ts'),
            dir,
            migrationsDir,
            tables: [...new Set(tables)],
        };
    });
}
//# sourceMappingURL=scanner.js.map