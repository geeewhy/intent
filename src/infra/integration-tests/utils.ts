import { TemporalScheduler } from '../temporal/temporal-scheduler';
import { WorkflowExecutionInfo } from '@temporalio/client';
import { expect } from '@jest/globals';
import { Event } from '../../core/contracts';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper function to wait for a specific time
 * @param ms The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to check if events were created
 * @param supabase The Supabase client
 * @param aggregateId The aggregate ID to check for events
 * @param expectedCount The expected number of events
 * @param TTL The maximum number of attempts to check for events
 * @returns An array of events
 */
export const checkForEvents = async (
  supabase: SupabaseClient,
  aggregateId: string, 
  expectedCount: number, 
  TTL = 500
): Promise<Event[]> => {
  let currentProgress = 0;
  let events: Event[] = [];

  while (currentProgress < TTL) {
    const {data, error} = await supabase
        .from('events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('created_at', {ascending: true});

    console.log('Got events:', data);

    if (error) {
      console.error('Error fetching events:', error);
    } else if (data && data.length >= expectedCount) {
      events = data;
      break;
    }

    let ttlIncrement = TTL/10;
    await wait(ttlIncrement);
    console.log('Waiting for events...');
    currentProgress += ttlIncrement;
  }

  return events;
};

/**
 * Generates the workflow ID for a processSaga workflow
 * @param tenantId The tenant ID
 * @param orderId The order ID
 * @returns The workflow ID for the processSaga workflow
 */
export const getSagaWorkflowId = (tenantId: string, orderId: string): string => {
  return `${tenantId}_${orderId}`;
};

/**
 * Generates the workflow ID for a processEvent workflow
 * @param tenantId The tenant ID
 * @param aggregateType The aggregate type
 * @param aggregateId The aggregate ID
 * @returns The workflow ID for the processEvent workflow
 */
export const getProcessEventWorkflowId = (tenantId: string, aggregateType: string, aggregateId: string): string => {
  return `${tenantId}_${aggregateType}-${aggregateId}`;
};

/**
 * Checks for running workflows with the specified workflow IDs
 * @param scheduler The temporal scheduler
 * @param workflowIds The workflow IDs to check for
 * @returns An array of running workflows
 */
export const getWorkflowsById = async (
  scheduler: TemporalScheduler,
  workflowIds: string[]
): Promise<WorkflowExecutionInfo[]> => {
  const workflowClient = await scheduler.getClient();
  const workflows: WorkflowExecutionInfo[] = [];

  for (const workflowId of workflowIds) {
    console.log(`Checking for workflow with ID: ${workflowId}`);
    const executions = workflowClient.list({ query: `WorkflowId = "${workflowId}"` });

    for await (const wf of executions) {
      workflows.push(wf);
    }
  }

  return workflows;
};

/**
 * Verifies that the expected workflows are running
 * @param runningWorkflows The array of running workflows
 * @param expectedWorkflowIds The expected workflow IDs
 * @param expectedCount The expected number of workflows
 */
export const verifyWorkflowsById = (
  runningWorkflows: WorkflowExecutionInfo[],
  expectedWorkflowIds: string[],
  expectedCount: number
): void => {
  // Verify that the expected number of workflows are running
  expect(runningWorkflows.length).toBe(expectedCount);

  // Check if we have all the expected workflow IDs
  const workflowIds = runningWorkflows.map(wf => wf.workflowId);
  for (const expectedId of expectedWorkflowIds) {
    expect(workflowIds).toContain(expectedId);
  }
};