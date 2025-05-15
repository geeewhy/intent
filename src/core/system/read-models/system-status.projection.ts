import { Event, EventHandler, ReadModelUpdaterPort } from '../../contracts';
import { SystemEventType } from '../contracts';
import { TestExecutedPayload } from '../contracts';

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
