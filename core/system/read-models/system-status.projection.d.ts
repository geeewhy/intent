import { EventHandler, ReadModelUpdaterPort } from '../../contracts';
/**
 * Metadata for the system status projection
 * This is used by external code that checks projection struct
 */
export declare const projectionMeta: {
    eventTypes: readonly ["testExecuted"];
    tables: readonly [{
        readonly name: "system_status";
        readonly columnTypes: {
            readonly id: "uuid";
            readonly tenant_id: "uuid";
            readonly testerId: "uuid";
            readonly testName: "text";
            readonly result: "text";
            readonly executedAt: "timestamp";
            readonly parameters: "jsonb";
            readonly numberExecutedTests: "integer";
            readonly updated_at: "timestamp";
            readonly last_event_id: "uuid";
            readonly last_event_version: "integer";
        };
    }, {
        readonly name: "system_metrics";
        readonly columnTypes: {
            readonly id: "uuid";
            readonly tenant_id: "uuid";
            readonly testCount: "integer";
            readonly updated_at: "timestamp";
            readonly last_event_id: "uuid";
            readonly last_event_version: "integer";
        };
    }];
};
/**
 * Creates a projection handler for the TEST_EXECUTED event
 * @param getUpdater Function to get an updater for a specific table
 * @returns An event handler for the TEST_EXECUTED event
 */
export declare function createSystemStatusProjection(getUpdater: (table: string) => ReadModelUpdaterPort<any>): EventHandler;
