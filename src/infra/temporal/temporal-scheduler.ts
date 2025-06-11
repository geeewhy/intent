// infra/temporal/temporal-scheduler.ts
import {WorkflowClient, WorkflowExecutionInfo, WorkflowHandle} from '@temporalio/client';
import {Command, Event} from '../../core/contracts';
import {log} from '../../core/logger';
import {CommandResult} from "../contracts";
import {WorkflowRouter} from './workflow-router';
import {JobSchedulerPort, EventPublisherPort, CommandStorePort} from '../../core/ports';
import {markConsumed} from '../pump/helpers/command-helpers';
import {PgCommandStore} from "../pg/pg-command-store";
import * as pg from "pg";

/**
 * TemporalScheduler - schedules commands and events via Temporal workflows
 */
export class TemporalScheduler implements JobSchedulerPort, EventPublisherPort {
    private constructor(
        private readonly router: WorkflowRouter,
        private readonly client: WorkflowClient,
        private readonly commandStore: CommandStorePort
    ) {
    }

    /** async builder */
    static async create(cfg?: any): Promise<TemporalScheduler> {
        const router = await WorkflowRouter.create(cfg);
        const client = (router as any)['client'] as WorkflowClient; // reuse internal client
        const pgCommandStore = new PgCommandStore();
        return new TemporalScheduler(router, client, pgCommandStore);
    }

    /* ---------- main API ---------- */

    /**
     * Get the Temporal client
     * @returns The Temporal client
     */
    async getClient() {
        return this.client;
    }

    /**
     * Schedule a command for execution via Temporal
     */
    async schedule(cmd: Command): Promise<CommandResult> {
        const logger = log()?.child({
            commandId: cmd.id,
            commandType: cmd.type,
            tenantId: cmd.tenant_id,
            correlationId: cmd.metadata?.correlationId
        });

        let res: CommandResult = {
            status: 'fail',
            error: new Error('Command not supported')
        };

        logger?.info('Routing command', {cmd});

        if (this.router.supportsCommand(cmd)) {
            try {
                await this.commandStore.upsert(cmd);
                res = await this.router.handle(cmd);
                const infraStatus = res.status === 'success' ? 'consumed' : 'failed';
                await this.commandStore.markStatus(cmd.id, infraStatus, res);
                logger?.debug('Marked command status', {status: infraStatus});
            } catch (e: any) {
                res = {status: 'fail', error: e.message};
                await this.commandStore.markStatus(cmd.id, 'failed', res);
                logger?.error('Failed to schedule command', {error: e});
            }
        } else {
            logger?.warn('No router supports command');
        }

        return res;
    }

    /**
     * Publish events to aggregates via Temporal
     */
    async publish(events: Event[]): Promise<void> {
        const logger = log()?.child({
            eventCount: events.length,
            eventTypes: events.map(e => e.type).join(', ')
        });

        logger?.info('Publishing events');

        for (const event of events) {
            if (await this.router.supportsEvent(event)) {
                await this.router.on(event);
            } else {
                const eventLogger = log()?.child({
                    eventType: event.type,
                    tenantId: event.tenant_id
                });
                eventLogger?.warn('Skipping unsupported event');
            }
        }
    }

    async close(): Promise<void> {
        await this.commandStore.close();
    }
}
