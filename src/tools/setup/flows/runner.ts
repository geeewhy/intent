//src/tools/setup/flows/runner.ts
/**
 * Flow runner - executes ordered steps
 */
import path from 'node:path';
import { CliOptions, FlowCtx, StepFunction } from '../shared/types';
import { createLogger } from '../shared/logger';
import { loadFlow } from './loader';

/**
 * Run a flow with the given options
 * @param flowName Name of the flow
 * @param options CLI options
 */
export async function runFlow(flowName: string, options: CliOptions): Promise<void> {
  const logger = createLogger();
  logger.info(`Running flow: ${flowName}`);

  try {
    // Load the flow
    const resolvedFlow = await loadFlow(flowName, options);

    // Create flow context
    const ctx: FlowCtx = {
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
      const stepName = path.basename(stepPath, '.ts');

      logger.info(`Step ${i + 1}/${resolvedFlow.stepPaths.length}: ${stepName}`);

      try {
        // Import the step module
        const stepModule = await import(stepPath);
        const stepFunction: StepFunction = stepModule.default;

        if (typeof stepFunction !== 'function') {
          throw new Error(`Step ${stepName} does not export a default function`);
        }

        // Execute the step
        await stepFunction(ctx);
        logger.info(`Step ${stepName} completed successfully`);
      } catch (error) {
        logger.error(`Step ${stepName} failed: ${(error as Error).message}`);
        throw error;
      }
    }

    logger.info(`Flow ${flowName} completed successfully`);
  } catch (error) {
    logger.error(`Flow ${flowName} failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Run a flow with the given options and handle errors
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns 0 for success, 1 for failure
 */
export async function runFlowWithErrorHandling(
  flowName: string,
  options: CliOptions
): Promise<number> {
  try {
    await runFlow(flowName, options);
    return 0;
  } catch (error) {
    console.error(`Error running flow ${flowName}: ${(error as Error).message}`);
    return 1;
  }
}
