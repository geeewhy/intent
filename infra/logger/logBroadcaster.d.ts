type LogLine = {
    timestamp: string;
    level: 'info' | 'error' | 'warning' | 'success';
    message: string;
    category: string;
    tenant_id: string;
    meta?: any;
};
type Subscriber = (log: LogLine) => void;
export declare function subscribeToLogs(fn: Subscriber): () => void;
export declare function broadcastLog(log: LogLine): void;
export {};
