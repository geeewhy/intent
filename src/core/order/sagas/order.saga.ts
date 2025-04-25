//order.saga.ts
import {Command, Event, ProcessPlan, SagaContext} from '../../contracts';

import {
    OrderCommandType,
    OrderEventType,
    UUID
} from '../contracts';

export class OrderSaga {
    static async react(input: Command | Event, ctx: SagaContext): Promise<ProcessPlan> {
        const plan: ProcessPlan = { commands: [] };

        switch (input.type) {
            case 'order.' + OrderCommandType.CREATE_ORDER: {
                console.log("TRIGGERED", input);
                const { orderId, userId } = input.payload;
                const tenantId = input.tenant_id;

                const cancelCmd: Command = {
                    id: await ctx.nextId(),
                    tenant_id: tenantId,
                    type: OrderCommandType.CANCEL_ORDER,
                    payload: { orderId, reason: 'Cook did not respond' },
                    metadata: {
                        userId,
                        timestamp: new Date(),
                        causationId: input.id,
                    },
                };

                plan.delays = [{ cmd: cancelCmd, ms: 2000 }]; // 30 minutes
                break;
            }

            case OrderCommandType.UPDATE_ORDER_STATUS: {
                const { orderId, status } = input.payload;
                const tenantId = input.tenant_id;

                if (status === 'confirmed') {
                    // Order confirmed; potentially schedule next step like auto-cook in 10m
                    const nextStatus: Command = {
                        id: await ctx.nextId(),
                        tenant_id: tenantId,
                        type: OrderCommandType.UPDATE_ORDER_STATUS,
                        payload: { orderId, status: 'cooking' },
                        metadata: {
                            userId: input.metadata?.userId,
                            timestamp: new Date(),
                            causationId: input.id,
                        },
                    };

                    plan.delays = [{ cmd: nextStatus, ms: 10 * 60 * 1000 }]; // e.g. auto-start cooking
                }

                break;
            }

            case OrderCommandType.CANCEL_ORDER:
                // Nothing to follow; cancel is terminal
                break;

            default:
                break;
        }

        return plan;
    }
}
