"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlowsRoot = getFlowsRoot;
exports.loadFlowMetadata = loadFlowMetadata;
exports.listProviders = listProviders;
exports.resolveProviderAndPath = resolveProviderAndPath;
exports.loadFlow = loadFlow;
//src/tools/setup/flows/loader.ts
/**
 * Flow loader - reads flow.yaml and resolves providers and paths
 */
const promises_1 = __importDefault(require("fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const prompt_1 = require("../shared/prompt");
const logger_1 = require("../shared/logger");
const validation_1 = require("../shared/validation");
const logger = (0, logger_1.createLogger)();
/**
 * Get the root directory for flows
 * @returns Absolute path to the flows directory
 */
function getFlowsRoot() {
    // In test environment, __dirname might not resolve correctly
    // Use a more reliable way to resolve the path
    return process.env.NODE_ENV === 'test'
        ? node_path_1.default.join(process.cwd(), 'src', 'tools', 'setup', 'flows')
        : node_path_1.default.join(__dirname);
}
/**
 * Load flow metadata from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow metadata
 */
async function loadFlowMetadata(flowName) {
    const flowRoot = node_path_1.default.join(getFlowsRoot(), flowName);
    const yamlPath = node_path_1.default.join(flowRoot, 'flow.yaml');
    try {
        const yamlContent = await promises_1.default.readFile(yamlPath, 'utf-8');
        const metadata = js_yaml_1.default.load(yamlContent);
        // Validate the metadata
        if (!metadata.defaultProvider) {
            throw new Error(`Missing defaultProvider in ${yamlPath}`);
        }
        if (!metadata.paths || Object.keys(metadata.paths).length === 0) {
            throw new Error(`No paths defined in ${yamlPath}`);
        }
        return metadata;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
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
async function listProviders(flowName) {
    const providersDir = node_path_1.default.join(getFlowsRoot(), flowName, 'providers');
    try {
        const entries = await promises_1.default.readdir(providersDir, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
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
async function resolveProviderAndPath(flowName, options) {
    const metadata = await loadFlowMetadata(flowName);
    const availableProviders = await listProviders(flowName);
    // Validate flow name
    validation_1.flowNameSchema.parse(flowName);
    // Resolve provider
    let provider;
    if (options.provider) {
        // Use provider from CLI options
        provider = validation_1.providerNameSchema.parse(options.provider);
        if (!availableProviders.includes(provider)) {
            throw new Error(`Provider ${provider} not found for flow ${flowName}`);
        }
    }
    else if (options.interactive) {
        // Prompt for provider
        provider = await (0, prompt_1.promptSelect)(`Select provider for ${flowName}:`, availableProviders, metadata.defaultProvider);
    }
    else {
        // Use default provider
        provider = metadata.defaultProvider;
        if (!availableProviders.includes(provider)) {
            throw new Error(`Default provider ${provider} not found for flow ${flowName}`);
        }
    }
    // Resolve path
    const availablePaths = Object.keys(metadata.paths);
    let pathName;
    if (options.path) {
        // Use path from CLI options
        pathName = validation_1.pathNameSchema.parse(options.path);
        if (!availablePaths.includes(pathName)) {
            throw new Error(`Path ${pathName} not found for flow ${flowName}`);
        }
    }
    else if (options.interactive) {
        // Prompt for path
        const pathChoices = availablePaths.map(p => ({
            title: `${p}: ${metadata.paths[p].description}`,
            value: p
        }));
        pathName = await (0, prompt_1.promptSelect)(`Select path for ${flowName}:`, availablePaths, availablePaths[0]);
    }
    else {
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
async function loadFlow(flowName, options) {
    logger.info(`Loading flow: ${flowName}`);
    const { provider, pathName } = await resolveProviderAndPath(flowName, options);
    const metadata = await loadFlowMetadata(flowName);
    // Get steps for the resolved path
    const pathConfig = metadata.paths[pathName];
    if (!pathConfig) {
        throw new Error(`Path ${pathName} not found in flow ${flowName}`);
    }
    const stepsDir = node_path_1.default.join(getFlowsRoot(), flowName, 'providers', provider, 'steps');
    const artifactsDir = node_path_1.default.join(getFlowsRoot(), flowName, 'providers', provider, 'artifacts');
    // Resolve step paths
    const stepPaths = pathConfig.steps.map(step => node_path_1.default.join(stepsDir, `${step}.ts`));
    logger.info(`Resolved flow: ${flowName}, provider: ${provider}, path: ${pathName}`);
    logger.debug(`Steps: ${stepPaths.join(', ')}`);
    return {
        provider,
        pathName,
        stepPaths,
        artifactsDir
    };
}
//# sourceMappingURL=loader.js.map