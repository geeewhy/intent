/**
 * PostgreSQL NOTIFY listener adapter
 */

import { Pool } from 'pg';
import { Event, UUID } from '../../core/contracts';
import { EventPort } from '../../core/ports';

/**
 * PgNotifyListener listens for PostgreSQL NOTIFY events for a specific tenant
 * and forwards them to the domain service
 */
export class PgNotifyListener {
  private pool: Pool;
  private client: any; // pg Client
  private isListening: boolean = false;

  /**
   * Constructor
   * @param tenantId The tenant ID to listen for events
   * @param eventPort The event port to forward events to
   * @param connectionConfig Optional PostgreSQL connection config
   */
  constructor(
    private readonly tenantId: UUID,
    private readonly eventPort: EventPort,
    connectionConfig?: any
  ) {
    this.pool = new Pool(connectionConfig || {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'kitcheneats',
    });
  }

  /**
   * Start listening for events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      return;
    }

    try {
      // Get a dedicated client from the pool
      this.client = await this.pool.connect();

      // Set up the notification listener
      this.client.on('notification', (msg: any) => {
        try {
          // Parse the event from the notification payload
          const event: Event = JSON.parse(msg.payload);
          
          // Forward the event to the domain service
          this.eventPort.on(event)
            .catch(err => console.error(`[PgNotifyListener] Error handling event: ${err.message}`));
        } catch (error) {
          console.error('[PgNotifyListener] Error processing notification:', error);
        }
      });

      // Listen for events for this tenant
      await this.client.query(`LISTEN events_${this.tenantId}`);
      
      console.log(`[PgNotifyListener] Started listening for events for tenant: ${this.tenantId}`);
      this.isListening = true;
    } catch (error) {
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
  async stop(): Promise<void> {
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
    } catch (error) {
      console.error('[PgNotifyListener] Error stopping listener:', error);
      throw error;
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.stop();
    await this.pool.end();
  }
}