import { ReadModelUpdaterPort } from '../contracts';
/**
 * Creates a mock read model updater for testing projections
 * @returns A mock read model updater with a store property for assertions
 */
export declare function createMockUpdater(): ReadModelUpdaterPort<any> & {
    store: Map<string, any>;
};
/**
 * Creates a mock updater function for testing multi-table projections
 * @returns A function that returns a mock updater for each table
 */
export declare function createMockUpdaterFunction(): ((table: string) => ReadModelUpdaterPort<any>) & {
    stores: Map<string, Map<string, any>>;
};
