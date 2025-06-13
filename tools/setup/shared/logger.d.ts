/**
 * Logger implementation for the setup tool
 */
import { Logger } from './types';
/**
 * Console logger implementation
 */
export declare class ConsoleLogger implements Logger {
    /**
     * Log an info message
     * @param message Message to log
     */
    info(message: string): void;
    /**
     * Raw log
     * @param message Message to log
     */
    raw(...message: any[]): void;
    /**
     * Log a warning message
     * @param message Message to log
     */
    warn(message: string): void;
    /**
     * Log an error message
     * @param message Message to log
     */
    error(message: string): void;
    /**
     * Log a debug message
     * @param message Message to log
     */
    debug(message: string): void;
}
/**
 * Create a new logger instance
 * @returns Logger instance
 */
export declare function createLogger(): Logger;
