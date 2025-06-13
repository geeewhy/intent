export declare function traceSpan<T>(name: string, attributes: Record<string, any>, fn: () => Promise<T>): Promise<T>;
