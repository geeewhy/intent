import { Worker } from '@temporalio/worker';
import { SagaRegistry } from './core/domains'; // central registry
import dotenv from 'dotenv';
import path from 'path';
import * as order from './core/order';
import * as coreActivities from './infra/temporal/activities/coreActivities';
import * as domainActivities from './core/activities';
import * as workflows from './infra/temporal/workflows';

const activities = {
  ...order.activities,
  ...coreActivities,
  ...domainActivities
}

dotenv.config();

/**
 * Start all tenant workers
 */
async function run() {
  const activeTenants = process.env.ACTIVE_TENANTS
      ? process.env.ACTIVE_TENANTS.split(',')
      : ['default'];

  console.log(`[Worker] Starting workers for tenants: ${activeTenants.join(', ')}`);

  console.log('[Worker] Loaded workflows:', Object.keys(workflows));

    const workers = await Promise.all(
      activeTenants.map(async (tenantId) => {
        const taskQueue = `saga-orderSaga`; //todo dont hardcode. should have tenantId
        const workflowsPath = path.resolve(__dirname, 'infra/temporal/workflows');
        return Worker.create({
          workflowsPath: workflowsPath, // register all workflows
          activities,
          taskQueue,
        });
      })
  );

  await Promise.all(workers.map((w) => {
      console.log(`[Worker] Starting worker for queue`, w.options.taskQueue);
      return w.run();
  }));

  console.log(`[Worker] All workers started (${workers.length})`);
}

run().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
