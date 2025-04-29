// infra/temporal/temporal-scheduler.ts
import { WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { Command, Event } from '../../core/contracts';
import { WorkflowRouter } from './workflow-router';
import { JobSchedulerPort, EventPublisherPort } from '../../core/ports';
import { markConsumed } from '../pump/helpers/command-helpers';

/**
 * TemporalScheduler - schedules commands and events via Temporal workflows
 */
export class TemporalScheduler implements JobSchedulerPort, EventPublisherPort {
  private workflowHandles = new Map<string, WorkflowHandle>();

  private constructor(
      private readonly router: WorkflowRouter,
      private readonly client: WorkflowClient
  ) {}

  /** async builder */
  static async create(cfg?: any): Promise<TemporalScheduler> {
    const router = await WorkflowRouter.create(cfg);
    const client = (router as any)['client'] as WorkflowClient; // reuse internal client

    return new TemporalScheduler(router, client);
  }

  /* ---------- main API ---------- */

  /**
   * Schedule a command for execution via Temporal
   */
  async schedule(cmd: Command): Promise<void> {
    console.log(`[TemporalScheduler] Routing command ${cmd.type}`);

    if (await this.router.supportsCommand(cmd)) {
      // The router.handle method now starts the workflow and waits for it to complete
      // before signaling any sagas, so we don't need to track it here
      await this.router.handle(cmd);

      // Mark the command as consumed after it's been handled
      await markConsumed(cmd.id);
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

  /* ---------- helpers ---------- */

  private async track(handle: WorkflowHandle, id: string, cmd: Command): Promise<void> {
    try {
      await handle.result();
      console.log(`[TemporalScheduler] Completed ${id}`);
      await markConsumed(cmd.id);
    } catch (e: any) {
      if (e.name === 'WorkflowNotFoundError') {
        console.warn(`[TemporalScheduler] Workflow ${id} not found — possibly completed early`);
      } else {
        console.error(`[TemporalScheduler] Failed ${id}`, e);
      }
    } finally {
      this.workflowHandles.delete(id);
    }
  }

  private getWorkflowId(cmd: Command): string {
    if (cmd.payload?.aggregateId && cmd.payload?.aggregateType) {
      return `${cmd.tenant_id}_${cmd.payload.aggregateType}-${cmd.payload.aggregateId}`;
    }
    return `${cmd.tenant_id}_${cmd.id}`; // fallback for saga commands
  }

  async getActiveWorkflows(): Promise<string[]> {
    return [...this.workflowHandles.keys()];
  }
}
