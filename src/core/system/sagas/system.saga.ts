import { Command, Event, ProcessPlan, SagaContext } from '../../contracts';
import { trace } from '../../shared/observability';
import { buildCommand } from '../../shared/command-factory';
import { inheritMetadata } from '../../shared/metadata';
import {
    SystemCommandType,
    SystemEventType,
    LogMessagePayload
} from '../contracts';

export class SystemSaga {
    static readonly sagaName = 'saga:' + SystemSaga.name;

    static reactsTo(): string[] {
        return [
            SystemEventType.MULTI_EVENT_EMITTED,
            SystemCommandType.EMIT_MULTIPLE_EVENTS,
            // Add other event types that the saga should react to
        ];
    }

    static async react(input: Command | Event, ctx: SagaContext): Promise<ProcessPlan> {
        const plan: ProcessPlan = { commands: [], delays:[] };
        const tenantId = input.tenant_id;
        const baseMeta = inheritMetadata(input, ctx, { source: this.sagaName });

        console.log(`[SystemSaga] Reacting to ${input.type} with id ${input.id}`, input);

        switch (input.type) {
            case SystemCommandType.EMIT_MULTIPLE_EVENTS: {
                plan.delays?.push({
                    cmd: buildCommand(
                        await ctx.nextId(),
                        tenantId,
                        SystemCommandType.LOG_MESSAGE,
                        {
                            aggregateType: 'system',
                            aggregateId: input.payload.aggregateId,
                            count: input.payload.count,
                            systemId: input.payload.systemId,
                            message: 'auto-trigger delayed from saga',
                        },
                        {
                            ...baseMeta,
                            causationId: input.id,
                        }
                    ),
                    ms: 3000,
                });
                break;
            }
            case SystemEventType.MULTI_EVENT_EMITTED: {
                if (input.payload.index === 2) {
                    plan.commands = [
                        buildCommand(
                            await ctx.nextId(), 
                            tenantId, 
                            SystemCommandType.LOG_MESSAGE, 
                            {
                                aggregateType: 'system',
                                aggregateId: input.payload.systemId,
                                message: 'auto-trigger immediate from saga',
                            } as LogMessagePayload,
                            {
                                ...baseMeta,
                                causationId: input.id,
                            }
                        )
                    ];

                    trace(ctx, 'SystemSaga:MULTI_EVENT_EMITTED', {
                        index: input.payload.index,
                        systemId: input.payload.systemId || ('aggregateId' in input ? input.aggregateId : undefined),
                        triggeredBy: input.type,
                    });
                }
                break;
            }
            // Add cases for other event types
        }

        return plan;
    }
}
