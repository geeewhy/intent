"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFlows = listFlows;
exports.getFlowDescription = getFlowDescription;
exports.getFlowsInfo = getFlowsInfo;
//src/tools/setup/flows/index.ts
/**
 * Flow index - enumerates available flows
 */
const promises_1 = __importDefault(require("fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const loader_1 = require("./loader");
/**
 * List all available flows
 * @returns Array of flow names
 */
async function listFlows() {
    const flowsRoot = (0, loader_1.getFlowsRoot)();
    try {
        const entries = await promises_1.default.readdir(flowsRoot, { withFileTypes: true });
        // Filter for directories
        const dirs = entries.filter(entry => entry.isDirectory() && entry.name !== 'node_modules');
        const flows = [];
        for (const dir of dirs) {
            const dirPath = node_path_1.default.join(flowsRoot, dir.name);
            // Check if flow.yaml exists in this directory
            try {
                const flowYamlPath = node_path_1.default.join(dirPath, 'flow.yaml');
                await promises_1.default.access(flowYamlPath);
                flows.push(dir.name);
                continue; // Found flow.yaml, no need to check subdirectories
            }
            catch (error) {
                // flow.yaml not found in this directory, check subdirectories
            }
            // Check subdirectories for flow.yaml
            try {
                const subdirs = await promises_1.default.readdir(dirPath, { withFileTypes: true });
                for (const subdir of subdirs.filter(entry => entry.isDirectory())) {
                    try {
                        const flowYamlPath = node_path_1.default.join(dirPath, subdir.name, 'flow.yaml');
                        await promises_1.default.access(flowYamlPath);
                        flows.push(subdir.name);
                    }
                    catch (error) {
                        // Skip subdirectories without flow.yaml
                        continue;
                    }
                }
            }
            catch (error) {
                // Skip if can't read subdirectories
                continue;
            }
        }
        return flows;
    }
    catch (error) {
        console.error(`Error listing flows: ${error.message}`);
        return [];
    }
}
/**
 * Get flow description from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow description or undefined if not found
 */
async function getFlowDescription(flowName) {
    const flowsRoot = (0, loader_1.getFlowsRoot)();
    // First, try to find flow.yaml directly in the flow directory
    let flowYamlPath = node_path_1.default.join(flowsRoot, flowName, 'flow.yaml');
    try {
        const yamlContent = await promises_1.default.readFile(flowYamlPath, 'utf-8');
        const match = yamlContent.match(/^description:\s*(.+)$/m);
        return match ? match[1].trim() : undefined;
    }
    catch (error) {
        // If not found, check subdirectories
        try {
            // Check each subdirectory of the flows directory
            const entries = await promises_1.default.readdir(flowsRoot, { withFileTypes: true });
            for (const dir of entries.filter(entry => entry.isDirectory() && entry.name !== 'node_modules')) {
                const dirPath = node_path_1.default.join(flowsRoot, dir.name);
                // Check subdirectories for the flow
                try {
                    const subdirs = await promises_1.default.readdir(dirPath, { withFileTypes: true });
                    for (const subdir of subdirs.filter(entry => entry.isDirectory() && entry.name === flowName)) {
                        flowYamlPath = node_path_1.default.join(dirPath, subdir.name, 'flow.yaml');
                        try {
                            const yamlContent = await promises_1.default.readFile(flowYamlPath, 'utf-8');
                            const match = yamlContent.match(/^description:\s*(.+)$/m);
                            return match ? match[1].trim() : undefined;
                        }
                        catch (error) {
                            // Skip if flow.yaml not found in this subdirectory
                            continue;
                        }
                    }
                }
                catch (error) {
                    // Skip if can't read subdirectories
                    continue;
                }
            }
        }
        catch (error) {
            // Skip if can't read flows directory
        }
        return undefined;
    }
}
/**
 * Get information about all available flows
 * @returns Array of flow information objects
 */
async function getFlowsInfo() {
    const flows = await listFlows();
    const flowsInfo = await Promise.all(flows.map(async (flowName) => {
        const description = await getFlowDescription(flowName);
        return { name: flowName, description };
    }));
    return flowsInfo;
}
//# sourceMappingURL=index.js.map