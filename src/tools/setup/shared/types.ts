//src/tools/setup/shared/types.ts
/**
 * Shared types for the setup tool
 */

/**
 * Context object passed to each step in a flow
 */
export interface FlowCtx {
  /**
   * Variables shared between steps
   */
  vars: Record<string, unknown>;

  /**
   * Current provider name
   */
  provider: string;

  /**
   * Current path name
   */
  pathName: string;

  /**
   * Absolute path to the provider's artifacts directory
   */
  artifactsDir: string;

  /**
   * Logger instance
   */
  logger: Logger;
}

/**
 * Logger interface for flow execution
 */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  raw(msg: any): void;
}

/**
 * Flow metadata from flow.yaml
 */
export interface FlowMetadata {
  defaultProvider: string;
  paths: Record<string, PathConfig>;
}

/**
 * Path configuration in flow.yaml
 */
export interface PathConfig {
  description: string;
  steps: string[];
}

/**
 * Result of flow resolution
 */
export interface ResolvedFlow {
  provider: string;
  pathName: string;
  stepPaths: string[];
  artifactsDir: string;
}

/**
 * CLI options
 */
export interface CliOptions {
  provider?: string;
  path?: string;
  interactive?: boolean;
  yes?: boolean;
}

/**
 * Step function type
 */
export type StepFunction = (ctx: FlowCtx) => Promise<void>;
