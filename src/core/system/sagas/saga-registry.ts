// core/system/sagas/saga-registry.ts
import { Command, Event, SagaDefinition } from '../../contracts';
import { SystemSaga } from './system.saga';

export const systemSagaRegistry: Record<string, SagaDefinition> = {
    systemSaga: {
        idFor: (msg: Command | Event) =>
            SystemSaga.reactsTo().includes(msg.type) ? `${msg.tenant_id}_${msg.payload.aggregateId}` : undefined,
        plan: SystemSaga.react,
        workflow: 'processSaga', // optional override
    },
};
