//src/tools/setup/flows/index.ts
/**
 * Flow index - enumerates available flows
 */
import fs from 'fs/promises';
import path from 'node:path';
import { getFlowsRoot } from './loader';

/**
 * List all available flows
 * @returns Array of flow names
 */
export async function listFlows(): Promise<string[]> {
  const flowsRoot = getFlowsRoot();

  try {
    const entries = await fs.readdir(flowsRoot, { withFileTypes: true });

    // Filter for directories
    const dirs = entries.filter(entry => entry.isDirectory() && entry.name !== 'node_modules');
    const flows: string[] = [];

    for (const dir of dirs) {
      const dirPath = path.join(flowsRoot, dir.name);

      // Check if flow.yaml exists in this directory
      try {
        const flowYamlPath = path.join(dirPath, 'flow.yaml');
        await fs.access(flowYamlPath);
        flows.push(dir.name);
        continue; // Found flow.yaml, no need to check subdirectories
      } catch (error) {
        // flow.yaml not found in this directory, check subdirectories
      }

      // Check subdirectories for flow.yaml
      try {
        const subdirs = await fs.readdir(dirPath, { withFileTypes: true });
        for (const subdir of subdirs.filter(entry => entry.isDirectory())) {
          try {
            const flowYamlPath = path.join(dirPath, subdir.name, 'flow.yaml');
            await fs.access(flowYamlPath);
            flows.push(subdir.name);
          } catch (error) {
            // Skip subdirectories without flow.yaml
            continue;
          }
        }
      } catch (error) {
        // Skip if can't read subdirectories
        continue;
      }
    }

    return flows;
  } catch (error) {
    console.error(`Error listing flows: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Get flow description from flow.yaml
 * @param flowName Name of the flow
 * @returns Flow description or undefined if not found
 */
export async function getFlowDescription(flowName: string): Promise<string | undefined> {
  const flowsRoot = getFlowsRoot();

  // First, try to find flow.yaml directly in the flow directory
  let flowYamlPath = path.join(flowsRoot, flowName, 'flow.yaml');

  try {
    const yamlContent = await fs.readFile(flowYamlPath, 'utf-8');
    const match = yamlContent.match(/^description:\s*(.+)$/m);
    return match ? match[1].trim() : undefined;
  } catch (error) {
    // If not found, check subdirectories
    try {
      // Check each subdirectory of the flows directory
      const entries = await fs.readdir(flowsRoot, { withFileTypes: true });
      for (const dir of entries.filter(entry => entry.isDirectory() && entry.name !== 'node_modules')) {
        const dirPath = path.join(flowsRoot, dir.name);

        // Check subdirectories for the flow
        try {
          const subdirs = await fs.readdir(dirPath, { withFileTypes: true });
          for (const subdir of subdirs.filter(entry => entry.isDirectory() && entry.name === flowName)) {
            flowYamlPath = path.join(dirPath, subdir.name, 'flow.yaml');
            try {
              const yamlContent = await fs.readFile(flowYamlPath, 'utf-8');
              const match = yamlContent.match(/^description:\s*(.+)$/m);
              return match ? match[1].trim() : undefined;
            } catch (error) {
              // Skip if flow.yaml not found in this subdirectory
              continue;
            }
          }
        } catch (error) {
          // Skip if can't read subdirectories
          continue;
        }
      }
    } catch (error) {
      // Skip if can't read flows directory
    }

    return undefined;
  }
}

/**
 * Get information about all available flows
 * @returns Array of flow information objects
 */
export async function getFlowsInfo(): Promise<Array<{ name: string; description?: string }>> {
  const flows = await listFlows();

  const flowsInfo = await Promise.all(
    flows.map(async (flowName) => {
      const description = await getFlowDescription(flowName);
      return { name: flowName, description };
    })
  );

  return flowsInfo;
}
