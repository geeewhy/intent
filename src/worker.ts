// src/infra/worker.ts
import {Worker} from '@temporalio/worker';
import dotenv from 'dotenv';
import path from 'path';
import * as coreActivities from './infra/temporal/activities/coreActivities';
import * as workflows from './infra/temporal/workflows';
import {setLoggerAccessor, log} from './core/logger';
import {stdLogger} from './infra/logger/stdLogger';

// bail out with error message and exit
function bail(message: string, meta?: unknown): never {
    const logger = log?.();
    if (logger) {
        logger.error(message, meta ? {error: meta} : undefined);
    } else {
        console.error(message, meta ?? '');
    }
    process.exit(1);
}

// time-zone guard
function assertUtc(): void {
    //bad ux to have it on non-production
    if (process.env.TZ && process.env.TZ !== 'UTC') {
        bail(`Fatal: runtime must run in UTC (process.env.TZ = ${process.env.TZ})`);
    }

    const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (sysTz && sysTz !== 'UTC') {
        bail(`Fatal: runtime must run in UTC (system timezone = ${sysTz})`);
    }
}

const activities = {
    ...coreActivities,
};

dotenv.config();

// --- run fn
async function run() {
    // Logger bootstrap
    if (process.env.NODE_ENV === 'production') assertUtc();

    setLoggerAccessor(() => stdLogger);
    const logger = log();

    // CLI arg: custom task-queue (last arg wins)
    const cmdArgs = process.argv.slice(2);
    const customTaskQueue =
        cmdArgs.length > 0 ? cmdArgs[cmdArgs.length - 1] : null;

    const activeTenants = process.env.ACTIVE_TENANTS
        ? process.env.ACTIVE_TENANTS.split(',')
        : ['default'];

    logger?.info(`Starting workers for tenants: ${activeTenants.join(', ')}`);
    logger?.info(`Loaded workflows: ${Object.keys(workflows)}`);
    if (customTaskQueue) logger?.info(`Using custom task queue: ${customTaskQueue}`);

    const workers = await Promise.all(
        activeTenants.map(async () => {
            const taskQueue = customTaskQueue || 'aggregates';
            const workflowsPath = path.resolve(__dirname, 'infra/temporal/workflows');
            return Worker.create({
                workflowsPath, // register all workflows
                activities,
                taskQueue,
            });
        }),
    );

    await Promise.all(
        workers.map((w) => {
            logger?.info(`Starting worker for queue: ${w.options.taskQueue}`);
            return w.run();
        }),
    );

    logger?.info(`All workers started (${workers.length})`);
}

run().catch((err) => bail('Fatal error', err));
