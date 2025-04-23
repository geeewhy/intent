/**
 * Temporal scheduler adapter
 */

import { Connection, WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { Command, UUID } from '../../domain/contracts';
import { JobSchedulerPort } from '../../domain/ports';

/**
 * Temporal implementation of the JobSchedulerPort
 */
export class TemporalScheduler implements JobSchedulerPort {
  private client: WorkflowClient | null = null;
  private connectionConfig?: any;
  private workflowHandles: Map<string, WorkflowHandle<any>> = new Map();

  /**
   * Constructor
   */
  constructor(connectionConfig?: any) {
    this.connectionConfig = connectionConfig;
    console.log(`[TemporalScheduler] Initializing Temporal Scheduler...`);
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
      const handle = await client.start(cmd.type, {
        args: [cmd],
        taskQueue,
        workflowId,
      });

      // Store the workflow handle for later tracking
      this.workflowHandles.set(workflowId, handle);

      console.log(`[TemporalScheduler] Workflow scheduled: ${workflowId}`);

      // Set up completion tracking for this workflow - make sure not to await it
      // so we don't block the command processing
      this.trackWorkflowCompletion(handle, workflowId, cmd.type)
          .catch(err => {
            console.error(`[TemporalScheduler] Error tracking workflow completion for ${workflowId}:`, err);
          });

      // Also add a direct listener for workflow completion as a backup
      handle.result()
          .then(result => {
            console.log(`[TemporalScheduler] Workflow completed (direct): ${workflowId} (${cmd.type})`);
          })
          .catch(err => {
            console.error(`[TemporalScheduler] Workflow failed (direct): ${workflowId} (${cmd.type})`, err);
          });

    } catch (error) {
      console.error(`[TemporalScheduler] Error scheduling workflow:`, error);
      throw error;
    }
  }

  /**
   * Track workflow execution and completion
   */
  /**
   * Track workflow execution and completion
   */
  private async trackWorkflowCompletion(
      handle: WorkflowHandle<any>,
      workflowId: string,
      workflowType: string
  ): Promise<void> {
    try {
      // Get the execution description
      const description = await handle.describe();
      console.log(`[TemporalScheduler] Workflow state update: ${workflowId} (${workflowType}) is now ${description.status.name}`);

      // Wait for the workflow to complete
      const result = await handle.result();
      console.log(`[TemporalScheduler] Workflow completed successfully: ${workflowId} (${workflowType})`);
      console.log(`[TemporalScheduler] Workflow completion details - ID: ${workflowId}, Type: ${workflowType}, Result: ${JSON.stringify(result)}`);

      // Clean up our local reference
      this.workflowHandles.delete(workflowId);
    } catch (error) {
      console.error(`[TemporalScheduler] Workflow failed: ${workflowId} (${workflowType})`, error);
      // Clean up our local reference even on failure
      this.workflowHandles.delete(workflowId);
    }
  }

  /**
   * Get the current state of a workflow
   */
  async getWorkflowState(workflowId: string): Promise<string> {
    try {
      const client = await this.getClient();
      const handle = client.getHandle(workflowId);
      const description = await handle.describe();
      return description.status.name;
    } catch (error) {
      console.error(`[TemporalScheduler] Error getting workflow state for ${workflowId}:`, error);
      return 'UNKNOWN';
    }
  }

  /**
   * Get handles for all active workflows
   */
  async getActiveWorkflows(): Promise<string[]> {
    return Array.from(this.workflowHandles.keys());
  }
}