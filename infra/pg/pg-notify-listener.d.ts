/**
 * PostgreSQL NOTIFY listener adapter
 */
import { UUID } from '../../core/contracts';
import { EventPort } from '../../core/ports';
/**
 * PgNotifyListener listens for PostgreSQL NOTIFY events for a specific tenant
 * and forwards them to the domain service
 */
export declare class PgNotifyListener {
    private readonly tenantId;
    private readonly eventPort;
    private pool;
    private client;
    private isListening;
    /**
     * Constructor
     * @param tenantId The tenant ID to listen for events
     * @param eventPort The event port to forward events to
     * @param connectionConfig Optional PostgreSQL connection config
     */
    constructor(tenantId: UUID, eventPort: EventPort, connectionConfig?: any);
    /**
     * Start listening for events
     */
    start(): Promise<void>;
    /**
     * Stop listening for events
     */
    stop(): Promise<void>;
    /**
     * Close the connection pool
     */
    close(): Promise<void>;
}
