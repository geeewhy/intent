import { Event, Command } from '../../contracts';
import { SystemCommand, SystemCommandType, SystemEvent, SystemEventType, LogMessagePayload } from '../contracts';
import { buildCommand } from '../../utils/command-factory';

export function systemSaga(event: Event): Command[] {
  if (event.type === SystemEventType.MULTI_EVENT_EMITTED && event.payload.index === 2) {
    return [
      buildCommand<LogMessagePayload>(
        crypto.randomUUID(),
        event.tenant_id,
        SystemCommandType.LOG_MESSAGE,
        { 
          message: 'auto-triggered from saga',
          systemId: event.payload.systemId || event.aggregateId
        },
        {
          correlationId: event.metadata?.correlationId,
          causationId: event.id,
          source: 'systemSaga'
        }
      )
    ];
  }

  return [];
}
