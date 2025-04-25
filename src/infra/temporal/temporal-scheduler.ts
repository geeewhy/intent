// infra/temporal/temporal-scheduler.ts
import { WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { Command } from '../../core/contracts';
import { WorkflowRouter } from './workflow-router';
import { JobSchedulerPort } from '../../core/ports';
import {markConsumed} from "../pump/helpers/command-helpers";

export class TemporalScheduler implements JobSchedulerPort {
  private workflowHandles = new Map<string, WorkflowHandle>();

  private constructor(
      private readonly router: WorkflowRouter,
      private readonly client: WorkflowClient
  ) {}

  /** async builder */
  static async create(cfg?: any) {
    const router  = await WorkflowRouter.create(cfg);
    const client  = (router as any)['client'] as WorkflowClient; // reuse same client
    return new TemporalScheduler(router, client);
  }

  /* ---------- main API ---------- */

  async schedule(cmd: Command) {
    console.log(`[TemporalScheduler] routing ${cmd.type}`);
    await this.router.handle(cmd);

    const workflowId = `${cmd.tenant_id}_${cmd.id}`;
    const handle     = this.client.getHandle(workflowId);
    this.workflowHandles.set(workflowId, handle);

    /* non-blocking result tracking */
    this.track(handle, workflowId, cmd).catch(console.error);
  }

  /* ---------- helpers ---------- */

  private async track(handle: WorkflowHandle, id: string, cmd: Command) {
    try {
      await handle.result();
      console.log(`[TemporalScheduler] completed ${id}`);
      await markConsumed(cmd.id);
    } catch (e: any) {
      if (e.name === 'WorkflowNotFoundError') {
        console.warn(`[TemporalScheduler] Workflow ${id} not found — possibly completed early`);
      } else {
        console.error(`[TemporalScheduler] failed ${id}`, e);
      }
    } finally {
      this.workflowHandles.delete(id);
    }
  }

  async getActiveWorkflows() {
    return [...this.workflowHandles.keys()];
  }
}
