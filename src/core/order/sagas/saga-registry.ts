// core/order/sagas/saga-registry.ts
import { Command, Event, SagaDefinition } from '../../contracts';
import { OrderSaga } from './order.saga';

export const orderSagaRegistry: Record<string, SagaDefinition> = {
    orderSaga: {
        idFor: (msg: Command | Event) =>
            msg.type.startsWith('order.') ? `${msg.tenant_id}-${msg.payload.orderId}` : undefined,
        plan: OrderSaga.react,
        workflow: 'processSaga', // optional override
    },
};

