"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectionMeta = void 0;
exports.createSystemStatusProjection = createSystemStatusProjection;
const type_guards_1 = require("../../shared/type-guards");
const logger_1 = require("../../logger");
/**
 * Metadata for the system status projection
 * This is used by external code that checks projection struct
 */
exports.projectionMeta = {
    eventTypes: ['testExecuted'],
    tables: [
        {
            name: 'system_status',
            columnTypes: {
                'id': 'uuid',
                'tenant_id': 'uuid',
                'testerId': 'uuid',
                'testName': 'text',
                'result': 'text', // enum: 'success' | 'failure'
                'executedAt': 'timestamp',
                'parameters': 'jsonb',
                'numberExecutedTests': 'integer',
                'updated_at': 'timestamp',
                'last_event_id': 'uuid',
                'last_event_version': 'integer',
            },
        },
        // Example of a second table (metrics)
        {
            name: 'system_metrics',
            columnTypes: {
                'id': 'uuid',
                'tenant_id': 'uuid',
                'testCount': 'integer',
                'updated_at': 'timestamp',
                'last_event_id': 'uuid',
                'last_event_version': 'integer',
            },
        },
    ],
};
/**
 * Creates a projection handler for the TEST_EXECUTED event
 * @param getUpdater Function to get an updater for a specific table
 * @returns An event handler for the TEST_EXECUTED event
 */
function createSystemStatusProjection(getUpdater) {
    // Get updaters for each table
    const statusUpdater = getUpdater('system_status');
    const metricsUpdater = getUpdater('system_metrics');
    return {
        supportsEvent(event) {
            return exports.projectionMeta.eventTypes.includes(event.type);
        },
        async on(event) {
            const logger = (0, logger_1.createLoggerForProjection)('SystemStatus');
            logger?.info('Processing event', {
                eventType: event.type,
                tenantId: event.tenant_id,
                aggregateId: event.aggregateId
            });
            const { tenant_id, aggregateId, payload, metadata } = event;
            if (!tenant_id || !aggregateId || !payload) {
                const err = new Error(`Invalid event ${event.type}. Missing tenant_id, aggregateId, or payload.`);
                logger?.error('Invalid event', {
                    eventType: event.type,
                    error: err
                });
                throw err;
            }
            // Build data for the status table
            const statusData = {
                id: aggregateId,
                tenant_id,
                testerId: payload.testerId,
                testName: payload.testName,
                result: payload.result,
                executedAt: payload.executedAt,
                parameters: payload.parameters,
                numberExecutedTests: payload.numberExecutedTests,
                updated_at: metadata?.timestamp,
                last_event_id: event.id,
                last_event_version: event.version,
            };
            // Runtime type guard for the status table
            (0, type_guards_1.assertDataPropsMatchMapKeys)(statusData, exports.projectionMeta.tables[0].columnTypes);
            // Update the status table
            await statusUpdater.upsert(tenant_id, aggregateId, statusData);
            // Build data for the metrics table
            const metricsData = {
                id: aggregateId,
                tenant_id,
                testCount: payload.numberExecutedTests || 1,
                updated_at: metadata?.timestamp,
                last_event_id: event.id,
                last_event_version: event.version,
            };
            // Runtime type guard for the metrics table
            (0, type_guards_1.assertDataPropsMatchMapKeys)(metricsData, exports.projectionMeta.tables[1].columnTypes);
            // Update the metrics table
            await metricsUpdater.upsert(tenant_id, aggregateId, metricsData);
        },
    };
}
//# sourceMappingURL=system-status.projection.js.map