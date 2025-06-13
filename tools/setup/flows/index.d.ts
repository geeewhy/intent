/**
 * List all available flows
 * @returns Array of flow names
 */
export declare function listFlows(): Promise<string[]>;
/**
 * Get flow description from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow description or undefined if not found
 */
export declare function getFlowDescription(flowName: string): Promise<string | undefined>;
/**
 * Get information about all available flows
 * @returns Array of flow information objects
 */
export declare function getFlowsInfo(): Promise<Array<{
    name: string;
    description?: string;
}>>;
