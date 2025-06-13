import { globSync } from 'glob';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectionMeta {
    /** e.g. system-status */
    name: string;
    dir: string;
    migrationsDir: string;
    tables: string[];
}

const PROJECTION_GLOB = 'src/core/**/read-models/*.projection.ts';

/** crude “CREATE TABLE …” parser  --  good enough for migration tracking */
function extractTables(sql: string): string[] {
    const rx = /create\s+table\s+(?:if\s+not\s+exists\s+)?("?[\w.]+"?)/gi;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = rx.exec(sql))) out.push(m[1].replace(/"/g, ''));
    return out;
}

export function scanProjections(): ProjectionMeta[] {
    return globSync(PROJECTION_GLOB, { absolute: true }).map(fp => {
        const dir = path.dirname(fp);
        const migrationsDir = path.join(dir, 'migrations');
        const tables = globSync(`${migrationsDir}/*.sql`, { absolute: true })
            .flatMap(f => extractTables(fs.readFileSync(f, 'utf8')));
        return {
            name: path.basename(fp, '.projection.ts'),
            dir,
            migrationsDir,
            tables: [...new Set(tables)],
        };
    });
}
