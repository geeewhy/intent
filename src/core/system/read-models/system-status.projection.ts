//src/core/system/read-models/system-status.projection.ts
import { Event, EventHandler, ReadModelUpdaterPort } from '../../contracts';
import { SystemEventType } from '../contracts';
import { TestExecutedPayload } from '../contracts';

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
  }
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
      return event.type === SystemEventType.TEST_EXECUTED;
    },

    async handle(event) {
      const { tenant_id, aggregateId, payload, metadata } = event;

      await updater.upsert(tenant_id, aggregateId, {
        id: aggregateId,
        tenant_id,
        testerId: payload.testerId,
        testName: payload.testName,
        result: payload.result,
        executedAt: payload.executedAt,
        parameters: payload.parameters,
        numberExecutedTests: payload.numberExecutedTests,
        updated_at: metadata?.timestamp,
      });
    },
  };
}
