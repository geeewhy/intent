import { LoggerPort } from '../../core/ports';
/**
 * Custom error serializer for structured logging (e.g. Pino).
 * Preserves standard fields and safely includes custom ones like `details`, `retryable`, etc.
 */
export declare const errorSerializer: (err: Error) => Record<string, unknown>;
export declare function getCallerInfo(depth?: number): {
    function: string;
    file: string;
    line: string;
    column: string;
    position: string;
};
export declare const stdLogger: LoggerPort;
