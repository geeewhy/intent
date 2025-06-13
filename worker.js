"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/infra/worker.ts
const worker_1 = require("@temporalio/worker");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const system = __importStar(require("./core/system"));
const coreActivities = __importStar(require("./infra/temporal/activities/coreActivities"));
const domainActivities = __importStar(require("./core/activities"));
const workflows = __importStar(require("./infra/temporal/workflows"));
const logger_1 = require("./core/logger");
const stdLogger_1 = require("./infra/logger/stdLogger");
// bail out with error message and exit
function bail(message, meta) {
    const logger = (0, logger_1.log)?.();
    if (logger) {
        logger.error(message, meta ? { error: meta } : undefined);
    }
    else {
        console.error(message, meta ?? '');
    }
    process.exit(1);
}
// time-zone guard
function assertUtc() {
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
    ...system.activities,
    ...coreActivities,
    ...domainActivities,
};
dotenv_1.default.config();
// --- run fn
async function run() {
    // Logger bootstrap
    if (process.env.NODE_ENV === 'production')
        assertUtc();
    (0, logger_1.setLoggerAccessor)(() => stdLogger_1.stdLogger);
    const logger = (0, logger_1.log)();
    // CLI arg: custom task-queue (last arg wins)
    const cmdArgs = process.argv.slice(2);
    const customTaskQueue = cmdArgs.length > 0 ? cmdArgs[cmdArgs.length - 1] : null;
    const activeTenants = process.env.ACTIVE_TENANTS
        ? process.env.ACTIVE_TENANTS.split(',')
        : ['default'];
    logger?.info(`Starting workers for tenants: ${activeTenants.join(', ')}`);
    logger?.info(`Loaded workflows: ${Object.keys(workflows)}`);
    if (customTaskQueue)
        logger?.info(`Using custom task queue: ${customTaskQueue}`);
    const workers = await Promise.all(activeTenants.map(async () => {
        const taskQueue = customTaskQueue || 'aggregates';
        const workflowsPath = path_1.default.resolve(__dirname, 'infra/temporal/workflows');
        return worker_1.Worker.create({
            workflowsPath, // register all workflows
            activities,
            taskQueue,
        });
    }));
    await Promise.all(workers.map((w) => {
        logger?.info(`Starting worker for queue: ${w.options.taskQueue}`);
        return w.run();
    }));
    logger?.info(`All workers started (${workers.length})`);
}
run().catch((err) => bail('Fatal error', err));
//# sourceMappingURL=worker.js.map