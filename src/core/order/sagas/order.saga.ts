//core/order/sagas/order.saga.ts
import {Command, Event, ProcessPlan, SagaContext} from '../../contracts';
import {trace} from '../../observability';
import {
    OrderCommandType,
    OrderEventType
} from '../contracts';

export class OrderSaga {
    static readonly sagaName = 'saga:'+OrderSaga.name;

    static reactsTo(): string[] {
        return [
            OrderCommandType.CREATE_ORDER,
            OrderCommandType.UPDATE_ORDER_STATUS,
            OrderCommandType.CANCEL_ORDER,
            OrderEventType.ORDER_CREATED,
            OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK,
            OrderEventType.ORDER_AUTO_ACCEPTED,
        ];
    }

    static async react(input: Command | Event, ctx: SagaContext): Promise<ProcessPlan> {
        const plan: ProcessPlan = {commands: []};

        switch (input.type) {
            // Saga now reacts to OrderCreated event instead of createOrder command
            case OrderEventType.ORDER_CREATED: {
                console.log("[OrderSaga] TRIGGERED by OrderCreated event", input);
                const {orderId, userId} = input.payload;
                const tenantId = input.tenant_id;
                const delayInMs = 2000;
                const cancelCmd: Command = {
                    id: await ctx.nextId(),
                    tenant_id: tenantId,
                    type: OrderCommandType.CANCEL_ORDER,
                    payload: {orderId, reason: 'Cook did not respond'},
                    metadata: {
                        userId,
                        timestamp: new Date(new Date().getTime() + delayInMs),
                        causationId: input.id,
                        correlationId: input.metadata?.correlationId,
                        source: this.sagaName,
                        requestId: ctx.getHint?.('requestId'),
                    },
                };

                plan.delays = [{cmd: cancelCmd, ms: delayInMs}];

                trace(ctx, 'OrderSaga:ORDER_CREATED', {
                    delayInMs,
                    orderId,
                    userId,
                    triggeredBy: input.type,
                });

                break;
            }

            // Keep this case for backward compatibility, but it's no longer the primary path
            case OrderCommandType.CREATE_ORDER: {
                console.log("[OrderSaga] TRIGGERED by createOrder command (deprecated path)", input);
                // No action needed - we now react to the OrderCreated event instead
                break;
            }

            case OrderCommandType.UPDATE_ORDER_STATUS: {
                const {orderId, status} = input.payload;
                const tenantId = input.tenant_id;
                const delayInMs = 10 * 60 * 1000;

                if (status === 'confirmed') {
                    // Order confirmed; potentially schedule next step like auto-cook in 10m
                    const nextStatus: Command = {
                        id: await ctx.nextId(),
                        tenant_id: tenantId,
                        type: OrderCommandType.UPDATE_ORDER_STATUS,
                        payload: {orderId, status: 'cooking'},
                        metadata: {
                            userId: input.metadata?.userId,
                            timestamp: new Date(new Date().getTime() + delayInMs),
                            causationId: input.id,
                            correlationId: input.metadata?.correlationId,
                            source: this.sagaName,
                            requestId: ctx.getHint?.('requestId'),
                        },
                    };

                    plan.delays = [{cmd: nextStatus, ms: delayInMs}]; // e.g. auto-start cooking
                }

                break;
            }

            case OrderCommandType.CANCEL_ORDER:
                // Nothing to follow; cancel is terminal
                trace(ctx, 'OrderSaga:CANCEL_ORDER', { note: 'No follow-up. Terminal.' });
                break;

            case OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK: {
                const {orderId, userId} = input.payload;
                const tenantId = input.tenant_id;

                // When an order is manually accepted by a cook, we might want to schedule
                // a reminder to start cooking if they don't start within a certain time
                const delayInMs = 15 * 60 * 1000; // 15 minutes
                const reminderCmd: Command = {
                    id: await ctx.nextId(),
                    tenant_id: tenantId,
                    type: OrderCommandType.UPDATE_ORDER_STATUS,
                    payload: {orderId, status: 'cooking'},
                    metadata: {
                        userId,
                        timestamp: new Date(new Date().getTime() + delayInMs),
                        causationId: input.id,
                        correlationId: input.metadata?.correlationId,
                        source: this.sagaName,
                        requestId: ctx.getHint?.('requestId'),
                    },
                };

                plan.delays = [{cmd: reminderCmd, ms: delayInMs}]; // 15 minutes
                break;
            }

            case OrderEventType.ORDER_AUTO_ACCEPTED: {
                const {orderId} = input.payload;
                const tenantId = input.tenant_id;

                // When an order is auto-accepted, we might want to schedule
                // an automatic transition to cooking status
                const delayInMs = 5 * 60 * 1000;
                const autoStartCmd: Command = {
                    id: await ctx.nextId(),
                    tenant_id: tenantId,
                    type: OrderCommandType.UPDATE_ORDER_STATUS,
                    payload: {orderId, status: 'cooking'},
                    metadata: {
                        timestamp: new Date(new Date().getTime() + delayInMs),
                        causationId: input.id,
                        correlationId: input.metadata?.correlationId,
                        source: this.sagaName,
                        requestId: ctx.getHint?.('requestId'),
                    },
                };

                plan.delays = [{cmd: autoStartCmd, ms: delayInMs}]; // 5 minutes
                break;
            }

            default:
                break;
        }

        return plan;
    }
}
