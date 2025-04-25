// infra/temporal/workflow-router.ts
import { Connection, WorkflowClient } from '@temporalio/client';
import { SagaRegistry } from '../../core/domains';
import { Command } from '../../core/contracts';
import { CommandHandler } from '../../core/command-bus';

export class WorkflowRouter implements CommandHandler {
  private constructor(private readonly client: WorkflowClient) {}

  /** factory */
  static async create(connectionCfg?: any): Promise<WorkflowRouter> {
    const connection = await Connection.connect(
        connectionCfg ?? { address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' }
    );
    return new WorkflowRouter(new WorkflowClient({ connection }));
  }

  supports(cmd: Command) {
    return Object.values(SagaRegistry).some((s) => s.idFor(cmd));
  }

  async handle(cmd: Command) {
    console.log(`[WorkflowRouter] Handling command ${cmd.id}`);
    const match = Object.values(SagaRegistry).find((s) => s.idFor(cmd));
    if (!match) return;

    const workflowId = match.idFor(cmd)!;
    const workflow   = match.workflow || 'processSaga';
    const taskQueue  = `saga-${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === match)}`;

    console.log(`[WorkflowRouter] Routing command ${cmd.id} to workflow ${workflow} with id: ${workflowId} and taskQueue: ${taskQueue}`);

    await this.client.signalWithStart(workflow, {
      workflowId,
      taskQueue,
      args: [cmd],
      signal: 'externalCommand',
      signalArgs: [cmd],
    });

    try {
      const handle = this.client.getHandle(workflowId);
      const desc = await handle.describe();
      //console.log(`[DEBUG] Workflow status:`, desc);
    } catch (err) {
      //console.error('[DEBUG] Failed to describe workflow:', err);
    }
  }
}
