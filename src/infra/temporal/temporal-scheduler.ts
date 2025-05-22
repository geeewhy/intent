// infra/temporal/temporal-scheduler.ts
import {WorkflowClient, WorkflowExecutionInfo, WorkflowHandle} from '@temporalio/client';
import {Command, Event} from '../../core/contracts';
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
        private readonly commandStore:CommandStorePort
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
    async schedule(cmd: Command): Promise<void> {
        console.log(`[TemporalScheduler] Routing command ${cmd.type}`);
        if (this.router.supportsCommand(cmd)) {
            try {
                await this.commandStore.upsert(cmd);
                const res: CommandResult = await this.router.handle(cmd);
                const infraStatus = res.status === 'success' ? 'consumed' : 'failed';
                await this.commandStore.markStatus(cmd.id, infraStatus, res);
                console.log(`[TemporalScheduler] Marked command ${cmd.id} as ${infraStatus}`);
            } catch (e: any) {
                await this.commandStore.markStatus(cmd.id, 'failed', { status: 'fail', error: e.message });
                console.error(`[TemporalScheduler] Failed to schedule command ${cmd.type}`, e);
            }
        } else {
            console.warn(`[TemporalScheduler] No router supports command ${cmd.type}`);
        }
    }

    /**
     * Publish events to aggregates via Temporal
     */
    async publish(events: Event[]): Promise<void> {
        console.log(`[TemporalScheduler] Publishing ${events.length} events`);

        for (const event of events) {
            if (await this.router.supportsEvent(event)) {
                await this.router.on(event);
            }
        }
    }

    async close(): Promise<void> {
        await this.commandStore.close();
    }
}
