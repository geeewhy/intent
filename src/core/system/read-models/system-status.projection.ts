//src/core/system/read-models/system-status.projection.ts
import { Event, EventHandler, ReadModelUpdaterPort } from '../../contracts';
import { SystemEventType } from '../contracts';
import { TestExecutedPayload } from '../contracts';
import { assertDataPropsMatchMapKeys } from '../../shared/type-guards';

/**
 * Metadata for the system status projection
 * This is used by the schema drift detection tool
 */
export const projectionMeta = {
  table: 'system_status',
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
  eventTypes: ['testExecuted'],
};

//compile time guardrails
type SystemStatusProjectionKeys = keyof typeof projectionMeta.columnTypes;
type SystemStatusProjectionShape = {
  [K in SystemStatusProjectionKeys]: any;
};

/**
 * Creates a projection handler for the TEST_EXECUTED event
 * @param updater The read model updater to use
 * @returns An event handler for the TEST_EXECUTED event
 */
export function createSystemStatusProjection(
  updater: ReadModelUpdaterPort<any>
): EventHandler {
  return {
    supportsEvent(event): event is Event<TestExecutedPayload> {
      return projectionMeta.eventTypes.includes(event.type);
    },

    async on(event) {
      console.log(`[System-Status-Projection] Handling event ${event.type} for tenant ${event.tenant_id} with aggregate ID ${event.aggregateId}`);
      const { tenant_id, aggregateId, payload, metadata } = event;

      if (!tenant_id || !aggregateId || !payload) {
        throw new Error(`[System-Status-Projection] Invalid event ${event.type}. Missing tenant_id, aggregateId, or payload.`);
      }

      const upsertData: SystemStatusProjectionShape = {
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
      }

      //runtime type guard
      assertDataPropsMatchMapKeys(upsertData, projectionMeta.columnTypes);

      await updater.upsert(tenant_id, aggregateId, upsertData);
    },
  };
}
