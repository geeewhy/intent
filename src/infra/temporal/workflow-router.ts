// infra/temporal/workflow-router.ts
import { Connection, WorkflowClient, WorkflowIdReusePolicy } from '@temporalio/client';
import { SagaRegistry } from '../../core/domains';
import { Command } from '../../core/contracts';
import { CommandHandler } from '../../core/command-bus';
import { Event, UUID } from '../../core/contracts';
import { EventHandler } from '../../core/event-bus';

// Define the result type for the workflow
type CommandResult = {
    status: 'success' | 'fail';
    events?: Event[];
    error?: string;
};

/**
 * Unified workflow router for aggregates and sagas
 */
export class WorkflowRouter implements CommandHandler, EventHandler {
  private constructor(private readonly client: WorkflowClient) {}

  /** factory */
  static async create(connectionCfg?: any): Promise<WorkflowRouter> {
    const connection = await Connection.connect(
        connectionCfg ?? { address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' }
    );
    return new WorkflowRouter(new WorkflowClient({ connection }));
  }

  /** Supports command routing (aggregate or saga) */
  supportsCommand(cmd: Command): boolean {
    return (
        (!!cmd.payload?.aggregateId && !!cmd.payload?.aggregateType) ||
        Object.values(SagaRegistry).some((s) => s.idFor(cmd))
    );
  }

  /** Supports event routing (only aggregates) */
  supportsEvent(event: Event): event is Event {
    return !!event.aggregateId && !!event.payload?.aggregateType;
  }

  /** Handle a command (always route to aggregate's processCommand workflow) */
  async handle(cmd: Command): Promise<void> {
    if (this.isAggregateCommand(cmd)) {
      const { tenant_id } = cmd;
      const aggregateType = cmd.payload.aggregateType;
      const aggregateId = cmd.payload.aggregateId;
      const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

      // Start the aggregate workflow
      console.log(`[WorkflowRouter] Starting aggregate workflow for command ${cmd.type}`);
      const handle = await this.client.start('processCommand', {
        workflowId,
        taskQueue: 'aggregates',
        args: [tenant_id, aggregateType, aggregateId, cmd],
        workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
      });

      // Wait for the aggregate workflow to complete
      try {
        console.log(`[WorkflowRouter] Waiting for aggregate workflow ${workflowId} to complete`);
        const result = await handle.result() as CommandResult;

        // Check if this is a business rule violation
        if (result.status === 'fail') {
          console.log(`[WorkflowRouter] Business rule violation in workflow ${workflowId}: ${result.error}`);
          // We don't consider this a failure, just log it
        } else {
          console.log(`[WorkflowRouter] Aggregate workflow ${workflowId} completed successfully`);
        }

        // If Saga listens to commands too, signal Saga after Aggregate workflow completion
        if (this.isSagaCommand(cmd)) {
          console.log(`[WorkflowRouter] Signaling saga for command ${cmd.type} after aggregate workflow completion`);
          await this.routeSagaCommand(cmd);
        }
      } catch (error) {
        console.error(`[WorkflowRouter] Error waiting for aggregate workflow ${workflowId} to complete:`, error);
        // Still signal the saga even if the aggregate workflow fails
        if (this.isSagaCommand(cmd)) {
          console.log(`[WorkflowRouter] Signaling saga for command ${cmd.type} after aggregate workflow failure`);
          await this.routeSagaCommand(cmd);
        }
      }
    } else if (this.isSagaCommand(cmd)) {
      // If it's only a saga command (not an aggregate command), route it to saga
      await this.routeSagaCommand(cmd);
    } else {
      console.warn(`[WorkflowRouter] Ignored unsupported command: ${cmd.type}`);
    }
  }

  /** Handle an event for aggregates and sagas */
  async on(event: Event): Promise<void> {
    if (!this.supportsEvent(event)) {
      console.warn(`[WorkflowRouter] Ignored unsupported event`);
      return;
    }

    console.log(`[WorkflowRouter] Handling event: ${event.type}`);

    // Route to Aggregate (processEvent)
    const { tenant_id, aggregateId } = event;
    const aggregateType = event.payload.aggregateType;
    const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

    await this.client.signalWithStart('processEvent', {
      workflowId,
      taskQueue: 'aggregates',
      args: [tenant_id, aggregateType, aggregateId, event],
      signal: 'event',
      signalArgs: [event],
      workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });

    // Route to Saga(s) (processSaga) that match the event
    for (const saga of Object.values(SagaRegistry)) {
      const sagaWorkflowId = saga.idFor(event);
      if (sagaWorkflowId) {
        console.log(`[WorkflowRouter] Routing event ${event.type} to saga workflow ${sagaWorkflowId}`);

        const workflow = saga.workflow || 'processSaga';
        const taskQueue = `saga-${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === saga)}`;

        await this.client.signalWithStart(workflow, {
          workflowId: sagaWorkflowId,
          taskQueue,
          args: [event], // Pass the event as the initial input
          signal: 'externalEvent', // New signal type for events
          signalArgs: [event],
          workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
        });
      }
    }
  }

  /** Route a command to an aggregate */
  private async routeAggregateCommand(cmd: Command): Promise<void> {
    const { tenant_id } = cmd;
    const aggregateType = cmd.payload.aggregateType;
    const aggregateId = cmd.payload.aggregateId;
    const workflowId = this.getAggregateWorkflowId(tenant_id, aggregateType, aggregateId);

    console.log(`[WorkflowRouter] Routing aggregate command ${cmd.type} to workflow ${workflowId}`);

    await this.client.signalWithStart('processCommand', {
      workflowId,
      taskQueue: 'aggregates',
      args: [tenant_id, aggregateType, aggregateId, cmd],
      signal: 'command',
      signalArgs: [cmd],
      workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
    });
  }

  /** Route a command to a saga (process manager) */
  private async routeSagaCommand(cmd: Command): Promise<void> {
    const match = Object.values(SagaRegistry).find((s) => s.idFor(cmd));
    if (!match) return;

    const workflowId = match.idFor(cmd)!;

    const workflow = match.workflow || 'processSaga';
    const taskQueue = `saga-${Object.keys(SagaRegistry).find(k => SagaRegistry[k] === match)}`;

    console.log(`[WorkflowRouter] Routing saga command ${cmd.type} to workflow ${workflowId} on taskQueue ${taskQueue}`);

    await this.client.signalWithStart(workflow, {
      workflowId,
      taskQueue,
      args: [cmd],
      signal: 'externalCommand',
      signalArgs: [cmd],
      workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
    });
  }

  /** Check if a command is for a saga */
  private isSagaCommand(cmd: Command): boolean {
    return Object.values(SagaRegistry).some((s) => s.idFor(cmd));
  }

  /** Check if a command is for an aggregate */
  private isAggregateCommand(cmd: Command): boolean {
    return !!cmd.payload?.aggregateId && !!cmd.payload?.aggregateType;
  }

  /** Get workflow ID for aggregates */
  private getAggregateWorkflowId(tenantId: UUID, aggregateType: string, aggregateId: UUID): string {
    return `${tenantId}_${aggregateType}-${aggregateId}`;
  }
}
