import { ProjectionMeta } from './scanner';
export interface MigrationPlan {
    projections: ProjectionMeta[];
    forceRls: boolean;
    rebuild: {
        projections: ProjectionMeta[];
        tables: string[];
    };
}
export declare function buildPlan(all: ProjectionMeta[], argv: string[]): MigrationPlan;
