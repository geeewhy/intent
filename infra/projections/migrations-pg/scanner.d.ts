export interface ProjectionMeta {
    /** e.g. system-status */
    name: string;
    dir: string;
    migrationsDir: string;
    tables: string[];
}
export declare function scanProjections(): ProjectionMeta[];
