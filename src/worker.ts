//src/infra/worker.ts
import { Worker } from '@temporalio/worker';
import path from 'path';
import dotenv from 'dotenv';

import { createPool } from './infra/projections/pg-pool';
import { projectEvents as projectEventsInfra } from './infra/projections/projectEvents';

import * as systemActs  from './core/system';
import * as coreActs    from './infra/temporal/activities/coreActivities';
import * as domainActs  from './core/activities';

dotenv.config();

// collect all activities the worker will expose
const activities = {
    ...systemActs.activities,
    ...coreActs,
    ...domainActs,
};

async function run() {
    const taskQueue     = process.env.TASK_QUEUE ?? 'aggregates';
    const workflowsPath = path.resolve(__dirname, 'infra/temporal/workflows');

    const worker = await Worker.create({
        workflowsPath,
        activities,
        taskQueue,
    });

    console.log(`[Worker] started on queue "${taskQueue}"`);

    await worker.run().finally(async () => {
        console.log('[Worker] pool closed, worker shutdown complete');
    });
}

run().catch((err) => {
    console.error('[Worker] fatal error:', err);
    process.exit(1);
});
