/**
 * Generic pump for Supabase real-time events
 */
/**
 * Pump configuration
 */
export interface PumpConfig<Row> {
    /** Supabase channel name */
    channel: string;
    /** postgres_changes filter */
    eventSpec: {
        event: 'INSERT';
        schema: string;
        table: string;
        filter?: string;
    };
    /** Batch size for processing (default 50) */
    batchSize?: number;
    /** Fast reject rows we don't want */
    validate: (row: Row) => boolean;
    /** Process an array of rows (batch) */
    processBatch: (rows: Row[]) => Promise<void>;
}
/**
 * Generic real-time pump base class
 */
export declare class RealtimePumpBase<Row = any> {
    private cfg;
    private sb;
    private queue;
    private draining;
    /**
     * Constructor
     * @param cfg Pump configuration
     */
    constructor(cfg: PumpConfig<Row>);
    /**
     * Start the pump
     */
    start(): Promise<void>;
    /**
     * Drain the queue
     */
    private drain;
}
