"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowRouter = void 0;
// infra/temporal/workflow-router.ts
const client_1 = require("@temporalio/client");
const registry_1 = require("../../core/registry");
const logger_1 = require("../../core/logger");
// Get the saga registry from the central registry
const SagaRegistry = (0, registry_1.getAllSagas)();
/**
 * Unified workflow router for aggregates and sagas
 */
class WorkflowRouter {
    constructor(client) {
        this.client = client;
    }
    /** factory */
    static async create(connectionCfg) {
        const connection = await client_1.Connection.connect(connectionCfg ?? { address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
        return new WorkflowRouter(new client_1.WorkflowClient({ connection }));
    }
    /** Supports command routing (aggregate or saga) */
    supportsCommand(cmd) {
        return this.isAggregateCommand(cmd) || this.isSagaCommand(cmd);
    }
    /** Supports event routing */
    supportsEvent(event) {
        return !!event.aggregateId && !!event.aggregateType;
    }
    /** Handle a command (always route to aggregate's processCommand workflow) */
    async handle(cmd) {
        var _a, _b;
        const meta = registry_1.DomainRegistry.commandTypes()[cmd.type];
        const routing = meta?.aggregateRouting;
        if (routing) {
            (_a = cmd.payload).aggregateType ?? (_a.aggregateType = routing.aggregateType);
            (_b = cmd.payload).aggregateId ?? (_b.aggregateId = routing.extractId(cmd.payload));
        }
        if (this.isAggregateCommand(cmd)) {
            const { tenant_id } = cmd;
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
            const logger = (0, logger_1.log)()?.child({
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
                const result = await handle.result();
                try {
                    logger?.debug('Waiting for aggregate workflow to complete');
                    // Check if this is a business rule violation
                    if (result.status === 'fail') {
                        logger?.error('Business rule violation in workflow', { error: result.error });
                        // We don't consider this a failure, just log it
                    }
                    else {
                        logger?.info('Aggregate workflow completed successfully');
                    }
                    // If Saga listens to commands too, signal Saga after Aggregate workflow completion
                    if (this.isSagaCommand(cmd)) {
                        logger?.info('Signaling saga after aggregate workflow completion');
                        return this.routeSagaCommand(cmd);
                    }
                    return result;
                }
                catch (err) {
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
        }
        else if (this.isSagaCommand(cmd)) {
            // If it's only a saga command (not an aggregate command), route it to saga
            return this.routeSagaCommand(cmd);
        }
        else {
            const logger = (0, logger_1.log)()?.child({
                commandType: cmd.type,
                tenantId: cmd.tenant_id
            });
            logger?.warn('Ignored unsupported command');
            return { status: 'fail', error: new Error(`Unsupported command: ${cmd.type}`) };
        }
    }
    async handleWithAggregate(cmd, aggregate) {
        throw new Error('Not supported');
    }
    /** Handle an event for aggregates and sagas */
    async on(event) {
        if (!this.supportsEvent(event)) {
            const logger = (0, logger_1.log)();
            logger?.warn('Ignored unsupported event', { event });
            return;
        }
        const logger = (0, logger_1.log)()?.child({
            eventType: event.type,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            tenantId: event.tenant_id,
            version: event.version
        });
        logger?.info('Handling event');
        // Route to Aggregate (processEvent)
        const { tenant_id, aggregateId } = event;
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
                const sagaLogger = (0, logger_1.log)()?.child({
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
    async routeSagaCommand(cmd) {
        const match = Object.values(SagaRegistry).find((s) => s.idFor(cmd));
        if (!match) {
            const logger = (0, logger_1.log)()?.child({
                commandType: cmd.type,
                tenantId: cmd.tenant_id
            });
            logger?.warn('No matching saga for command');
            return { status: 'fail', error: Error(`No matching saga for command ${cmd.type}`) };
        }
        const workflowId = match.idFor(cmd);
        const workflow = match.workflow || 'processSaga';
        const taskQueue = `sagas`; //dedicated saga queue? ${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === match)}
        const { tenant_id } = cmd;
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
        const logger = (0, logger_1.log)()?.child({
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
        return { status: 'success' };
    }
    /** Check if a command is for a saga */
    isSagaCommand(cmd) {
        return Object.values(SagaRegistry).some((s) => s.idFor(cmd));
    }
    /** Check if a command is for an aggregate */
    isAggregateCommand(cmd) {
        const meta = registry_1.DomainRegistry.commandTypes()[cmd.type];
        return !!meta?.aggregateRouting || (!!cmd.payload?.aggregateId && !!cmd.payload?.aggregateType);
    }
    /** Get workflow ID for aggregates */
    getAggregateWorkflowId(tenantId, aggregateType, aggregateId) {
        return `${tenantId}_${aggregateType}-${aggregateId}`;
    }
}
exports.WorkflowRouter = WorkflowRouter;
//# sourceMappingURL=workflow-router.js.map