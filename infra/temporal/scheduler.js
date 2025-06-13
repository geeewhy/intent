"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const logger_1 = require("../../core/logger");
const workflow_router_1 = require("./workflow-router");
const pg_command_store_1 = require("../pg/pg-command-store");
/**
 * TemporalScheduler - schedules commands and events via Temporal workflows
 */
class Scheduler {
    constructor(router, client, commandStore) {
        this.router = router;
        this.client = client;
        this.commandStore = commandStore;
    }
    /** async builder */
    static async create(cfg) {
        const router = await workflow_router_1.WorkflowRouter.create(cfg);
        const client = router['client']; // reuse internal client
        const pgCommandStore = new pg_command_store_1.PgCommandStore();
        return new Scheduler(router, client, pgCommandStore);
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
    async schedule(cmd) {
        const logger = (0, logger_1.log)()?.child({
            commandId: cmd.id,
            commandType: cmd.type,
            tenantId: cmd.tenant_id,
            correlationId: cmd.metadata?.correlationId
        });
        let res = {
            status: 'fail',
            error: new Error('Command not supported')
        };
        logger?.info('Routing command', { cmd });
        if (this.router.supportsCommand(cmd)) {
            try {
                await this.commandStore.upsert(cmd);
                res = await this.router.handle(cmd);
                const infraStatus = res.status === 'success' ? 'consumed' : 'failed';
                await this.commandStore.markStatus(cmd.id, infraStatus, res);
                logger?.debug('Marked command status', { status: infraStatus });
            }
            catch (e) {
                res = { status: 'fail', error: e.message };
                await this.commandStore.markStatus(cmd.id, 'failed', res);
                logger?.error('Failed to schedule command', { error: e });
            }
        }
        else {
            logger?.warn('No router supports command');
        }
        return res;
    }
    /**
     * Publish events to aggregates via Temporal
     */
    async publish(events) {
        const logger = (0, logger_1.log)()?.child({
            eventCount: events.length,
            eventTypes: events.map(e => e.type).join(', ')
        });
        logger?.info('Publishing events');
        for (const event of events) {
            if (await this.router.supportsEvent(event)) {
                await this.router.on(event);
            }
            else {
                const eventLogger = (0, logger_1.log)()?.child({
                    eventType: event.type,
                    tenantId: event.tenant_id
                });
                eventLogger?.warn('Skipping unsupported event');
            }
        }
    }
    async close() {
        await this.commandStore.close();
    }
}
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map