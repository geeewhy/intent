// core/system/sagas/saga-registry.ts
import { Command, Event, SagaDefinition } from '../../../contracts';
import { SystemSaga } from './system.saga';

export const systemSagaRegistry: Record<string, SagaDefinition> = {
    systemSaga: {
        idFor: (msg: Command | Event) => {
            if (!SystemSaga.reactsTo().includes(msg.type)) return undefined;
            const aggregateId = 'aggregateId' in msg ? msg.aggregateId : msg.payload?.aggregateId;
            return SystemSaga.reactsTo().includes(msg.type) ? `${msg.tenant_id}_${aggregateId}` : undefined;
        },
        plan: SystemSaga.react,
        workflow: 'processSaga', // optional override
    },
};
