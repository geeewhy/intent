// infra/temporal/temporal-scheduler.ts
import {WorkflowClient, WorkflowExecutionInfo, WorkflowHandle} from '@temporalio/client';
import {Command, Event} from '../../core/contracts';
import {WorkflowRouter} from './workflow-router';
import {JobSchedulerPort, EventPublisherPort} from '../../core/ports';
import {markConsumed} from '../pump/helpers/command-helpers';

/**
 * TemporalScheduler - schedules commands and events via Temporal workflows
 */
export class TemporalScheduler implements JobSchedulerPort, EventPublisherPort {
    private constructor(
        private readonly router: WorkflowRouter,
        private readonly client: WorkflowClient,
    ) {
    }

    /** async builder */
    static async create(cfg?: any): Promise<TemporalScheduler> {
        const router = await WorkflowRouter.create(cfg);
        const client = (router as any)['client'] as WorkflowClient; // reuse internal client
        return new TemporalScheduler(router, client);
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
            // The router.handle method now starts the workflow and waits for it to complete
            // before signaling any sagas, so we don't need to track it here
            return this.router.handle(cmd)
                .then(() => {
                    console.log(`[TemporalScheduler] Marking command ${cmd.id} as consumed`);
                    markConsumed(cmd.id);
                })
                .catch(e => {
                    console.error(`[TemporalScheduler] Failed to schedule command ${cmd.type}`, e);
                });
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
}
