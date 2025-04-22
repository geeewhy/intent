/**
 * Temporal scheduler adapter
 */

import { Connection, WorkflowClient } from '@temporalio/client';
import { Command, UUID } from '../../domain/contracts';
import { JobSchedulerPort } from '../../domain/ports';

/**
 * Temporal implementation of the JobSchedulerPort
 */
export class TemporalScheduler implements JobSchedulerPort {
  private client: WorkflowClient | null = null;
  private connectionConfig?: any;

  /**
   * Constructor
   */
  constructor(connectionConfig?: any) {
    this.connectionConfig = connectionConfig;
  }

  /**
   * Get or create the workflow client
   */
  private async getClient(): Promise<WorkflowClient> {
    if (!this.client) {
      // Connect to the Temporal server
      const connection = await Connection.connect(this.connectionConfig || {
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      });

      // Create a workflow client
      this.client = new WorkflowClient({
        connection,
      });
    }

    return this.client;
  }

  /**
   * Schedule a command as a Temporal workflow
   */
  async schedule(cmd: Command): Promise<void> {
    try {
      console.log(`[TemporalScheduler] Scheduling workflow for command: ${cmd.type}`);

      // Create a workflow ID that includes the tenant ID for isolation
      const workflowId = `${cmd.tenant_id}_${cmd.id}`;

      // Create a task queue that includes the tenant ID for isolation
      const taskQueue = `tenant-${cmd.tenant_id}`;

      // Get the client
      const client = await this.getClient();

      // Start the workflow
      await client.start(cmd.type, {
        args: [cmd],
        taskQueue,
        workflowId,
      });

      console.log(`[TemporalScheduler] Workflow scheduled: ${workflowId}`);
    } catch (error) {
      console.error(`[TemporalScheduler] Error scheduling workflow:`, error);
      throw error;
    }
  }
}
