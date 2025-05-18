// core/order/sagas/order.saga.ts
import { Command, Event, ProcessPlan, SagaContext } from '../../contracts';
import { trace } from '../../shared/observability';
import { buildCommand } from '../../shared/command-factory';
import { inheritMetadata } from '../../shared/metadata';
import {
    OrderCommandType,
    OrderEventType,
} from '../contracts';

export class OrderSaga {
    static readonly sagaName = 'saga:' + OrderSaga.name;

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
        const plan: ProcessPlan = { commands: [] };
        const tenantId = input.tenant_id;
        const baseMeta = inheritMetadata(input, ctx, { source: this.sagaName });

        switch (input.type) {
            case OrderEventType.ORDER_CREATED: {
                const { orderId, userId } = input.payload;
                const delayInMs = 2000;

                plan.delays = [
                    {
                        cmd: buildCommand(await ctx.nextId(), tenantId, OrderCommandType.CANCEL_ORDER, {
                            orderId,
                            reason: 'Cook did not respond',
                        }, {
                            ...baseMeta,
                            userId,
                            timestamp: new Date(Date.now() + delayInMs),
                        }),
                        ms: delayInMs,
                    },
                ];

                trace(ctx, 'OrderSaga:ORDER_CREATED', {
                    delayInMs,
                    orderId,
                    userId,
                    triggeredBy: input.type,
                });

                break;
            }

            case OrderCommandType.UPDATE_ORDER_STATUS: {
                const { orderId, status } = input.payload;
                if (status === 'confirmed') {
                    const delayInMs = 10 * 60 * 1000;

                    plan.delays = [
                        {
                            cmd: buildCommand(await ctx.nextId(), tenantId, OrderCommandType.UPDATE_ORDER_STATUS, {
                                orderId,
                                status: 'cooking',
                            }, {
                                ...baseMeta,
                                userId: input.metadata?.userId,
                                timestamp: new Date(Date.now() + delayInMs),
                            }),
                            ms: delayInMs,
                        },
                    ];
                }

                break;
            }

            case OrderCommandType.CANCEL_ORDER: {
                trace(ctx, 'OrderSaga:CANCEL_ORDER', { note: 'No follow-up. Terminal.' });
                break;
            }

            case OrderEventType.ORDER_MANUALLY_ACCEPTED_BY_COOK: {
                const { orderId, userId } = input.payload;
                const delayInMs = 15 * 60 * 1000;

                plan.delays = [
                    {
                        cmd: buildCommand(await ctx.nextId(), tenantId, OrderCommandType.UPDATE_ORDER_STATUS, {
                            orderId,
                            status: 'cooking',
                        }, {
                            ...baseMeta,
                            userId,
                            timestamp: new Date(Date.now() + delayInMs),
                        }),
                        ms: delayInMs,
                    },
                ];

                break;
            }

            case OrderEventType.ORDER_AUTO_ACCEPTED: {
                const { orderId } = input.payload;
                const delayInMs = 5 * 60 * 1000;

                plan.delays = [
                    {
                        cmd: buildCommand(await ctx.nextId(), tenantId, OrderCommandType.UPDATE_ORDER_STATUS, {
                            orderId,
                            status: 'cooking',
                        }, {
                            ...baseMeta,
                            timestamp: new Date(Date.now() + delayInMs),
                        }),
                        ms: delayInMs,
                    },
                ];

                break;
            }
        }

        return plan;
    }
}
