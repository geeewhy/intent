// src/core/order/conditions/order-conditions.ts
import { registerCondition } from '../../policy-registry';
import { OrderAggregate } from '../aggregates/order.aggregate';

export const orderExists = (order: OrderAggregate): boolean => order.version > 0;
registerCondition('order.exists', orderExists);

export const orderIsPending = (order: OrderAggregate): boolean => order.status === 'pending';
registerCondition('order.isPending', orderIsPending);

export const orderIsNotCancelled = (order: OrderAggregate): boolean => order.status !== 'cancelled';
registerCondition('order.isNotCancelled', orderIsNotCancelled);