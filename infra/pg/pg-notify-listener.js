"use strict";
/**
 * PostgreSQL NOTIFY listener adapter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgNotifyListener = void 0;
const pg_1 = require("pg");
/**
 * PgNotifyListener listens for PostgreSQL NOTIFY events for a specific tenant
 * and forwards them to the domain service
 */
class PgNotifyListener {
    /**
     * Constructor
     * @param tenantId The tenant ID to listen for events
     * @param eventPort The event port to forward events to
     * @param connectionConfig Optional PostgreSQL connection config
     */
    constructor(tenantId, eventPort, connectionConfig) {
        this.tenantId = tenantId;
        this.eventPort = eventPort;
        this.isListening = false;
        this.pool = new pg_1.Pool(connectionConfig || {
            host: process.env.SUPABASE_DB_HOST || 'localhost',
            port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
            user: process.env.SUPABASE_DB_USER || 'postgres',
            password: process.env.SUPABASE_DB_PASSWORD || 'postgres',
            database: process.env.SUPABASE_DB_NAME || 'postgres',
        });
    }
    /**
     * Start listening for events
     */
    async start() {
        if (this.isListening) {
            return;
        }
        try {
            // Get a dedicated client from the pool
            this.client = await this.pool.connect();
            // Set up the notification listener
            this.client.on('notification', (msg) => {
                try {
                    // Parse the event from the notification payload
                    const event = JSON.parse(msg.payload);
                    // Forward the event to the domain service
                    this.eventPort.on(event)
                        .catch(err => console.error(`[PgNotifyListener] Error handling event: ${err.message}`));
                }
                catch (error) {
                    console.error('[PgNotifyListener] Error processing notification:', error);
                }
            });
            // Listen for events for this tenant
            await this.client.query(`LISTEN events_${this.tenantId}`);
            console.log(`[PgNotifyListener] Started listening for events for tenant: ${this.tenantId}`);
            this.isListening = true;
        }
        catch (error) {
            console.error('[PgNotifyListener] Error starting listener:', error);
            // Clean up if there was an error
            if (this.client) {
                this.client.release();
                this.client = null;
            }
            throw error;
        }
    }
    /**
     * Stop listening for events
     */
    async stop() {
        if (!this.isListening || !this.client) {
            return;
        }
        try {
            // Stop listening for events
            await this.client.query(`UNLISTEN events_${this.tenantId}`);
            // Release the client back to the pool
            this.client.release();
            this.client = null;
            console.log(`[PgNotifyListener] Stopped listening for events for tenant: ${this.tenantId}`);
            this.isListening = false;
        }
        catch (error) {
            console.error('[PgNotifyListener] Error stopping listener:', error);
            throw error;
        }
    }
    /**
     * Close the connection pool
     */
    async close() {
        await this.stop();
        await this.pool.end();
    }
}
exports.PgNotifyListener = PgNotifyListener;
//# sourceMappingURL=pg-notify-listener.js.map