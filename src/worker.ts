/**
 * Temporal worker entry point
 */

import { Worker } from '@temporalio/worker';
import * as activities from './infra/temporal/activities/order-activities';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Start the Temporal worker
 */
async function run() {
  try {
    // Get active tenants from the database
    // In a real implementation, this would query the database for active tenants
    // For now, we'll use a hardcoded list of tenant IDs
    const activeTenants = process.env.ACTIVE_TENANTS 
      ? process.env.ACTIVE_TENANTS.split(',') 
      : ['0af03580-98d5-4884-96e4-e75168d8b887'];

    console.log(`Starting workers for ${activeTenants.length} tenants`);

    // Create a worker for each tenant
    const workers = await Promise.all(
      activeTenants.map(async (tenantId) => {
        const taskQueue = `tenant-${tenantId}`;
        console.log(`Creating worker for tenant ${tenantId} with task queue ${taskQueue}`);

        return Worker.create({
          workflowsPath: require.resolve('./infra/temporal/workflows/order-workflows'),
          activities,
          taskQueue,
          // Optional: use a namespace per tenant for stronger isolation
          // namespace: tenantId,
        });
      })
    );

    // Also create a default worker for handling tasks not specific to a tenant
    const defaultWorker = await Worker.create({
      workflowsPath: require.resolve('./infra/temporal/workflows/order-workflows'),
      activities,
      taskQueue: 'default',
    });

    workers.push(defaultWorker);

    // Start all workers
    await Promise.all(workers.map(worker => worker.run()));

    console.log(`${workers.length} workers started successfully`);
  } catch (error) {
    console.error('Error starting workers:', error);
    process.exit(1);
  }
}

// Run the worker
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
