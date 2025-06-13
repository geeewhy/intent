import { CliOptions, FlowMetadata, ResolvedFlow } from '../shared/types';
/**
 * Get the root directory for flows
 * @returns Absolute path to the flows directory
 */
export declare function getFlowsRoot(): string;
/**
 * Load flow metadata from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow metadata
 */
export declare function loadFlowMetadata(flowName: string): Promise<FlowMetadata>;
/**
 * List available providers for a flow
 * @param flowName Name of the flow
 * @returns Array of provider names
 */
export declare function listProviders(flowName: string): Promise<string[]>;
/**
 * Resolve provider and path based on CLI options or interactive prompts
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns Resolved provider and path
 */
export declare function resolveProviderAndPath(flowName: string, options: CliOptions): Promise<{
    provider: string;
    pathName: string;
}>;
/**
 * Load a flow and resolve its provider, path, and steps
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns Resolved flow with provider, path, and step paths
 */
export declare function loadFlow(flowName: string, options: CliOptions): Promise<ResolvedFlow>;
