//src/core/system/read-models/system-status.projection.ts
import { Event, EventHandler, ReadModelUpdaterPort } from '../../contracts';
import { SystemEventType } from '../contracts';
import { TestExecutedPayload } from '../contracts';
import { assertDataPropsMatchMapKeys } from '../../shared/type-guards';
import { log, createLoggerForProjection } from '../../logger';

/**
 * Metadata for the system status projection
 * This is used by external code that checks projection struct
 */
export const projectionMeta = {
  eventTypes: ['testExecuted'] as const,
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
      } as const,
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
      } as const,
    },
  ] as const,
};

// Compile-time helpers
type TableNames = typeof projectionMeta.tables[number]['name'];

type Shape<T extends TableNames> =
  keyof Extract<
    typeof projectionMeta.tables[number],
    { name: T }
  >['columnTypes'] extends infer K
    ? { [P in K & string]: any }
    : never;

/**
 * Creates a projection handler for the TEST_EXECUTED event
 * @param getUpdater Function to get an updater for a specific table
 * @returns An event handler for the TEST_EXECUTED event
 */
export function createSystemStatusProjection(
  getUpdater: (table: string) => ReadModelUpdaterPort<any>
): EventHandler {
  // Get updaters for each table
  const statusUpdater = getUpdater('system_status');
  const metricsUpdater = getUpdater('system_metrics');

  return {
    supportsEvent(event): event is Event<TestExecutedPayload> {
      return projectionMeta.eventTypes.includes(event.type as any);
    },

    async on(event) {
      const logger = createLoggerForProjection('SystemStatus');
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
      const statusData: Shape<'system_status'> = {
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
      assertDataPropsMatchMapKeys(statusData, projectionMeta.tables[0].columnTypes);

      // Update the status table
      await statusUpdater.upsert(tenant_id, aggregateId, statusData);

      // Build data for the metrics table
      const metricsData: Shape<'system_metrics'> = {
        id: aggregateId,
        tenant_id,
        testCount: payload.numberExecutedTests || 1,
        updated_at: metadata?.timestamp,
        last_event_id: event.id,
        last_event_version: event.version,
      };

      // Runtime type guard for the metrics table
      assertDataPropsMatchMapKeys(metricsData, projectionMeta.tables[1].columnTypes);

      // Update the metrics table
      await metricsUpdater.upsert(tenant_id, aggregateId, metricsData);
    },
  };
}
