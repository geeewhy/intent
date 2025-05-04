// core/order/access.ts
import { registerCondition } from '../policy-registry';
import {OrderAccessCondition, OrderAccessContext} from './contracts';

registerCondition(OrderAccessCondition.CAN_AUTO_ACCEPT, ({ role }: OrderAccessContext) =>
    role === 'cook' || role === 'system'
);

registerCondition(OrderAccessCondition.CAN_CANCEL_ORDER, ({ userId, orderOwnerId }: OrderAccessContext) =>
    userId === orderOwnerId
);

export const orderAccessModel = {
    actors: {
        cook: ['acceptOrder', 'cancelOrder'],
        customer: ['createOrder'],
        system: ['autoAcceptOrder']
    },
};
