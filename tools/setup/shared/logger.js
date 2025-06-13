"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
exports.createLogger = createLogger;
/**
 * Console logger implementation
 */
class ConsoleLogger {
    /**
     * Log an info message
     * @param message Message to log
     */
    info(message) {
        console.log(`[INFO] ${message}`);
    }
    /**
     * Raw log
     * @param message Message to log
     */
    raw(...message) {
        console.log(...message);
    }
    /**
     * Log a warning message
     * @param message Message to log
     */
    warn(message) {
        console.warn(`[WARN] ${message}`);
    }
    /**
     * Log an error message
     * @param message Message to log
     */
    error(message) {
        console.error(`[ERROR] ${message}`);
    }
    /**
     * Log a debug message
     * @param message Message to log
     */
    debug(message) {
        if (process.env.DEBUG) {
            console.debug(`[DEBUG] ${message}`);
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/**
 * Create a new logger instance
 * @returns Logger instance
 */
function createLogger() {
    return new ConsoleLogger();
}
//# sourceMappingURL=logger.js.map