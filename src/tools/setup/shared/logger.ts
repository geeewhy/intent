//src/tools/setup/shared/logger.ts
/**
 * Logger implementation for the setup tool
 */
import { Logger } from './types';

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  /**
   * Log an info message
   * @param message Message to log
   */
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  /**
   * Raw log
   * @param message Message to log
   */
  raw(...message: any[]): void {
    console.log(...message);
  }

  /**
   * Log a warning message
   * @param message Message to log
   */
  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  /**
   * Log an error message
   * @param message Message to log
   */
  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  /**
   * Log a debug message
   * @param message Message to log
   */
  debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Create a new logger instance
 * @returns Logger instance
 */
export function createLogger(): Logger {
  return new ConsoleLogger();
}
