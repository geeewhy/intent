//src/tools/setup/flows/loader.ts
/**
 * Flow loader - reads flow.yaml and resolves providers and paths
 */
import fs from 'fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { CliOptions, FlowMetadata, ResolvedFlow } from '../shared/types';
import { promptSelect } from '../shared/prompt';
import { createLogger } from '../shared/logger';
import { flowNameSchema, pathNameSchema, providerNameSchema } from '../shared/validation';

const logger = createLogger();

/**
 * Get the root directory for flows
 * @returns Absolute path to the flows directory
 */
export function getFlowsRoot(): string {
  // In test environment, __dirname might not resolve correctly
  // Use a more reliable way to resolve the path
  return process.env.NODE_ENV === 'test'
    ? path.join(process.cwd(), 'src', 'tools', 'setup', 'flows')
    : path.join(__dirname);
}

/**
 * Load flow metadata from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow metadata
 */
export async function loadFlowMetadata(flowName: string): Promise<FlowMetadata> {
  const flowRoot = path.join(getFlowsRoot(), flowName);
  const yamlPath = path.join(flowRoot, 'flow.yaml');

  try {
    const yamlContent = await fs.readFile(yamlPath, 'utf-8');
    const metadata = yaml.load(yamlContent) as FlowMetadata;

    // Validate the metadata
    if (!metadata.defaultProvider) {
      throw new Error(`Missing defaultProvider in ${yamlPath}`);
    }

    if (!metadata.paths || Object.keys(metadata.paths).length === 0) {
      throw new Error(`No paths defined in ${yamlPath}`);
    }

    return metadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Flow ${flowName} not found or flow.yaml missing`);
    }
    throw error;
  }
}

/**
 * List available providers for a flow
 * @param flowName Name of the flow
 * @returns Array of provider names
 */
export async function listProviders(flowName: string): Promise<string[]> {
  const providersDir = path.join(getFlowsRoot(), flowName, 'providers');

  try {
    const entries = await fs.readdir(providersDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`No providers found for flow ${flowName}`);
    }
    throw error;
  }
}

/**
 * Resolve provider and path based on CLI options or interactive prompts
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns Resolved provider and path
 */
export async function resolveProviderAndPath(
  flowName: string,
  options: CliOptions
): Promise<{ provider: string; pathName: string }> {
  const metadata = await loadFlowMetadata(flowName);
  const availableProviders = await listProviders(flowName);

  // Validate flow name
  flowNameSchema.parse(flowName);

  // Resolve provider
  let provider: string;
  if (options.provider) {
    // Use provider from CLI options
    provider = providerNameSchema.parse(options.provider);
    if (!availableProviders.includes(provider)) {
      throw new Error(`Provider ${provider} not found for flow ${flowName}`);
    }
  } else if (options.interactive) {
    // Prompt for provider
    provider = await promptSelect(
      `Select provider for ${flowName}:`,
      availableProviders,
      metadata.defaultProvider
    );
  } else {
    // Use default provider
    provider = metadata.defaultProvider;
    if (!availableProviders.includes(provider)) {
      throw new Error(`Default provider ${provider} not found for flow ${flowName}`);
    }
  }

  // Resolve path
  const availablePaths = Object.keys(metadata.paths);
  let pathName: string;
  if (options.path) {
    // Use path from CLI options
    pathName = pathNameSchema.parse(options.path);
    if (!availablePaths.includes(pathName)) {
      throw new Error(`Path ${pathName} not found for flow ${flowName}`);
    }
  } else if (options.interactive) {
    // Prompt for path
    const pathChoices = availablePaths.map(p => ({
      title: `${p}: ${metadata.paths[p].description}`,
      value: p
    }));
    pathName = await promptSelect(
      `Select path for ${flowName}:`,
      availablePaths,
      availablePaths[0]
    );
  } else {
    // Use first path as default
    pathName = availablePaths[0];
  }

  return { provider, pathName };
}

/**
 * Load a flow and resolve its provider, path, and steps
 * @param flowName Name of the flow
 * @param options CLI options
 * @returns Resolved flow with provider, path, and step paths
 */
export async function loadFlow(flowName: string, options: CliOptions): Promise<ResolvedFlow> {
  logger.info(`Loading flow: ${flowName}`);

  const { provider, pathName } = await resolveProviderAndPath(flowName, options);
  const metadata = await loadFlowMetadata(flowName);

  // Get steps for the resolved path
  const pathConfig = metadata.paths[pathName];
  if (!pathConfig) {
    throw new Error(`Path ${pathName} not found in flow ${flowName}`);
  }

  const stepsDir = path.join(
    getFlowsRoot(),
    flowName,
    'providers',
    provider,
    'steps'
  );

  const artifactsDir = path.join(
    getFlowsRoot(),
    flowName,
    'providers',
    provider,
    'artifacts'
  );

  // Resolve step paths
  const stepPaths = pathConfig.steps.map(step => 
    path.join(stepsDir, `${step}.ts`)
  );

  logger.info(`Resolved flow: ${flowName}, provider: ${provider}, path: ${pathName}`);
  logger.debug(`Steps: ${stepPaths.join(', ')}`);

  return {
    provider,
    pathName,
    stepPaths,
    artifactsDir
  };
}
