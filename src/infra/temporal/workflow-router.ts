// infra/temporal/workflow-router.ts
import {Connection, WorkflowClient} from '@temporalio/client';
import {getAllSagas, DomainRegistry} from '../../core/registry';
import {Command, Event, UUID} from '../../core/contracts';
import {log} from '../../core/logger';
import {CommandHandler} from '../../core/contracts';
import {EventHandler} from '../../core/contracts';
import {BaseAggregate} from "../../core/base/aggregate";
import {CommandResult} from "../contracts";

// Get the saga registry from the central registry
const SagaRegistry = getAllSagas();

/**
 * Unified workflow router for aggregates and sagas
 */
export class WorkflowRouter implements CommandHandler, EventHandler {
    private constructor(private readonly client: WorkflowClient) {
    }

    /** factory */
    static async create(connectionCfg?: any): Promise<WorkflowRouter> {
        const connection = await Connection.connect(
            connectionCfg ?? {address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'}
        );
        return new WorkflowRouter(new WorkflowClient({connection}));
    }

    /** Supports command routing (aggregate or saga) */
    supportsCommand(cmd: Command): boolean {
        return this.isAggregateCommand(cmd) || this.isSagaCommand(cmd);
    }

    /** Supports event routing */
    supportsEvent(event: Event): event is Event {
        return !!event.aggregateId && !!event.aggregateType;
    }

    /** Handle a command (always route to aggregate's processCommand workflow) */
    async handle(cmd: Command): Promise<CommandResult> {
        const meta = DomainRegistry.commandTypes()[cmd.type];
        const routing = meta?.aggregateRouting;

        if (routing) {
            cmd.payload.aggregateType ??= routing.aggregateType;
            cmd.payload.aggregateId ??= routing.extractId(cmd.payload);
        }

        if (this.isAggregateCommand(cmd)) {
            const {tenant_id} = cmd;
            const aggregateType = cmd.payload?.aggregateType;
            const aggregateId = cmd.payload?.aggregateId;
            const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

            /*
            requires ElasticSearch.
            const searchAttributes = {
                aggregateType: [`${aggregateType}`],
                aggregateId: [`${aggregateId}`],
                tenantId: [`${tenant_id}`],
                causationId: [`${cmd.metadata?.causationId}`],
                correlationId: [`${cmd.metadata?.correlationId}`],
            }
            */

            // Start the aggregate workflow
            const logger = log()?.child({
                workflowId,
                aggregateType,
                aggregateId,
                commandType: cmd.type,
                tenantId: tenant_id
            });

            logger?.info('Starting aggregate workflow');
            const handle = this.client.signalWithStart('processCommand', {
                workflowId,
                taskQueue: 'aggregates',
                args: [tenant_id, aggregateType, aggregateId, cmd],
                signal: 'command',
                signalArgs: [cmd]
            });

            return handle.then(async (handle) => {
                logger?.info('Aggregate workflow started successfully');
                const result = await handle.result() as CommandResult;
                try {
                    logger?.debug('Waiting for aggregate workflow to complete');

                    // Check if this is a business rule violation
                    if (result.status === 'fail') {
                        logger?.error('Business rule violation in workflow', { error: result.error });
                        // We don't consider this a failure, just log it
                    } else {
                        logger?.info('Aggregate workflow completed successfully');
                    }

                    // If Saga listens to commands too, signal Saga after Aggregate workflow completion
                    if (this.isSagaCommand(cmd)) {
                        logger?.info('Signaling saga after aggregate workflow completion');
                        return this.routeSagaCommand(cmd);
                    }

                    return result;
                } catch (err) {
                    if (err) {
                        logger?.warn('Error waiting for aggregate workflow to complete', { error: err });
                    }
                    // Still signal the saga even if the aggregate workflow fails
                    if (this.isSagaCommand(cmd)) {
                        logger?.info('Signaling saga after aggregate workflow failure');
                        return this.routeSagaCommand(cmd);
                    }
                    return {
                        status: 'fail',
                        error: err instanceof Error ? err : new Error(String(err)),
                    };
                }
            });
        } else if (this.isSagaCommand(cmd)) {
            // If it's only a saga command (not an aggregate command), route it to saga
            return this.routeSagaCommand(cmd);
        } else {
            const logger = log()?.child({
                commandType: cmd.type,
                tenantId: cmd.tenant_id
            });
            logger?.warn('Ignored unsupported command');
            return { status: 'fail', error: new Error(`Unsupported command: ${cmd.type}`) };
        }
    }

    async handleWithAggregate(cmd: Command, aggregate: BaseAggregate<any>): Promise<Event[]> {
        throw new Error('Not supported');
    }

    /** Handle an event for aggregates and sagas */
    async on(event: Event): Promise<void> {
        if (!this.supportsEvent(event)) {
            const logger = log();
            logger?.warn('Ignored unsupported event', { event });
            return;
        }

        const logger = log()?.child({
            eventType: event.type,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            tenantId: event.tenant_id,
            version: event.version
        });

        logger?.info('Handling event');

        // Route to Aggregate (processEvent)
        const {tenant_id, aggregateId} = event;
        const aggregateType = event.aggregateType;
        const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

        await this.client.signalWithStart('processEvent', {
            workflowId,
            taskQueue: 'aggregates',
            args: [tenant_id, aggregateType, aggregateId, event],
            signal: 'event',
            signalArgs: [event]
        });

        // Route to Saga(s) (processSaga) that match the event
        for (const saga of Object.values(SagaRegistry)) {
            const sagaWorkflowId = saga.idFor(event);
            if (sagaWorkflowId) {
                const sagaLogger = log()?.child({
                    eventType: event.type,
                    sagaWorkflowId,
                    tenantId: event.tenant_id
                });

                sagaLogger?.info('Routing event to saga workflow');

                const workflow = saga.workflow || 'processSaga';
                const taskQueue = `sagas`; //-${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === saga)}

                await this.client.signalWithStart(workflow, {
                    workflowId: sagaWorkflowId,
                    taskQueue,
                    args: [event], // Pass the event as the initial input
                    signal: 'externalEvent', // New signal type for events
                    signalArgs: [event]
                });
            }
        }
    }

    /** Route a command to a saga (process manager) */
    private async routeSagaCommand(cmd: Command): Promise<CommandResult> {
        const match = Object.values(SagaRegistry).find((s) => s.idFor(cmd));
        if (!match) {
            const logger = log()?.child({
                commandType: cmd.type,
                tenantId: cmd.tenant_id
            });
            logger?.warn('No matching saga for command');
            return {status: 'fail', error: Error(`No matching saga for command ${cmd.type}`)};
        }

        const workflowId = match.idFor(cmd)!;
        const workflow = match.workflow || 'processSaga';
        const taskQueue = `sagas`; //dedicated saga queue? ${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === match)}
        const {tenant_id} = cmd;
        const aggregateType = cmd.payload?.aggregateType;
        const aggregateId = cmd.payload?.aggregateId;

        /*
        requires ElasticSearch.
        const searchAttributes = {
            aggregateType: [`${aggregateType}`],
            aggregateId: [`${aggregateId}`],
            tenantId: [`${tenant_id}`],
            causationId: [`${cmd.metadata?.causationId}`],
            correlationId: [`${cmd.metadata?.correlationId}`],
        }
        */

        const logger = log()?.child({
            commandType: cmd.type,
            workflowId,
            taskQueue,
            tenantId: tenant_id,
            aggregateType,
            aggregateId
        });

        logger?.info('Routing saga command to workflow');

        await this.client.signalWithStart(workflow, {
            workflowId,
            taskQueue,
            args: [cmd],
            signal: 'externalCommand',
            signalArgs: [cmd],
            //workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE, //prevent sequential execution
        });
        return {status: 'success'};
    }

    /** Check if a command is for a saga */
    private isSagaCommand(cmd: Command): boolean {
        return Object.values(SagaRegistry).some((s) => s.idFor(cmd));
    }

    /** Check if a command is for an aggregate */
    private isAggregateCommand(cmd: Command): boolean {
        const meta = DomainRegistry.commandTypes()[cmd.type];
        return !!meta?.aggregateRouting || (!!cmd.payload?.aggregateId && !!cmd.payload?.aggregateType);
    }

    /** Get workflow ID for aggregates */
    private getAggregateWorkflowId(tenantId: UUID, aggregateType: string, aggregateId: UUID): string {
        return `${tenantId}_${aggregateType}-${aggregateId}`;
    }
}
