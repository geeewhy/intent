//src/infra/worker.ts
import { Worker } from '@temporalio/worker';
import { SagaRegistry } from './core/domains'; // central registry
import dotenv from 'dotenv';
import path from 'path';
import * as system from './core/system';
import * as coreActivities from './infra/temporal/activities/coreActivities';
import * as domainActivities from './core/activities';
import * as workflows from './infra/temporal/workflows';
import { setLoggerAccessor, log } from './core/logger';
import { stdLogger } from './infra/logger/stdLogger';

const activities = {
    ...system.activities,
    ...coreActivities,
    ...domainActivities
}

dotenv.config();

/**
 * Start all tenant workers
 */
async function run() {
    // Initialize the logger
    setLoggerAccessor(() => stdLogger);
    const logger = log();

    // Get the task queue from command line args (last argument)
    const cmdArgs = process.argv.slice(2);
    const customTaskQueue = cmdArgs.length > 0 ? cmdArgs[cmdArgs.length - 1] : null;

    const activeTenants = process.env.ACTIVE_TENANTS
        ? process.env.ACTIVE_TENANTS.split(',')
        : ['default'];

    logger?.info(`Starting workers for tenants: ${activeTenants.join(', ')}`);
    logger?.info(`Loaded workflows: ${Object.keys(workflows)}`);

    if (customTaskQueue) {
        logger?.info(`Using custom task queue: ${customTaskQueue}`);
    }

    const workers = await Promise.all(
        activeTenants.map(async (tenantId) => {
            // Use custom task queue if provided, otherwise use the default
            const taskQueue = customTaskQueue || `aggregates`;
            const workflowsPath = path.resolve(__dirname, 'infra/temporal/workflows');
            return Worker.create({
                workflowsPath: workflowsPath, // register all workflows
                activities,
                taskQueue,
            });
        })
    );

    await Promise.all(workers.map((w) => {
        logger?.info(`Starting worker for queue: ${w.options.taskQueue}`);
        return w.run();
    }));

    logger?.info(`All workers started (${workers.length})`);
}

run().catch((err) => {
    log()?.error('Fatal error', { error: err });
    process.exit(1);
});
