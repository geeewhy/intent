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
exports.runFlow = runFlow;
exports.runFlowWithErrorHandling = runFlowWithErrorHandling;
//src/tools/setup/flows/runner.ts
/**
 * Flow runner - executes ordered steps
 */
const node_path_1 = __importDefault(require("node:path"));
const logger_1 = require("../shared/logger");
const loader_1 = require("./loader");
/**
 * Run a flow with the given options
 * @param flowName Name of the flow
 * @param options CLI options
 */
async function runFlow(flowName, options) {
    const logger = (0, logger_1.createLogger)();
    logger.info(`Running flow: ${flowName}`);
    try {
        // Load the flow
        const resolvedFlow = await (0, loader_1.loadFlow)(flowName, options);
        // Create flow context
        const ctx = {
            vars: {
                // Pass the yes flag to the context if it's set
                ...(options.yes && { yes: true })
            },
            provider: resolvedFlow.provider,
            pathName: resolvedFlow.pathName,
            artifactsDir: resolvedFlow.artifactsDir,
            logger
        };
        // Execute steps sequentially
        logger.info(`Executing ${resolvedFlow.stepPaths.length} steps for path: ${resolvedFlow.pathName}`);
        for (let i = 0; i < resolvedFlow.stepPaths.length; i++) {
            const stepPath = resolvedFlow.stepPaths[i];
            const stepName = node_path_1.default.basename(stepPath, '.ts');
            logger.info(`Step ${i + 1}/${resolvedFlow.stepPaths.length}: ${stepName}`);
            try {
                // Import the step module
                const stepModule = await Promise.resolve(`${stepPath}`).then(s => __importStar(require(s)));
                const stepFunction = stepModule.default;
                if (typeof stepFunction !== 'function') {
                    throw new Error(`Step ${stepName} does not export a default function`);
                }
                // Execute the step
                await stepFunction(ctx);
                logger.info(`Step ${stepName} completed successfully`);
            }
            catch (error) {
                logger.error(`Step ${stepName} failed: ${error.message}`);
                throw error;
            }
        }
        logger.info(`Flow ${flowName} completed successfully`);
    }
    catch (error) {
        logger.error(`Flow ${flowName} failed: ${error.message}`);
        throw error;
    }
}
/**
 * Run a flow with the given options and handle errors
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns 0 for success, 1 for failure
 */
async function runFlowWithErrorHandling(flowName, options) {
    try {
        await runFlow(flowName, options);
        return 0;
    }
    catch (error) {
        console.error(`Error running flow ${flowName}: ${error.message}`);
        console.error(error.stack);
        return 1;
    }
}
//# sourceMappingURL=runner.js.map