import { CliOptions } from '../shared/types';
/**
 * Run a flow with the given options
 * @param flowName Name of the flow
 * @param options CLI options
 */
export declare function runFlow(flowName: string, options: CliOptions): Promise<void>;
/**
 * Run a flow with the given options and handle errors
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns 0 for success, 1 for failure
 */
export declare function runFlowWithErrorHandling(flowName: string, options: CliOptions): Promise<number>;
