/**
 * Supabase server for handling client connections and commands
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Command, Event, UUID } from '../../domain/contracts';
import { CommandPort } from '../../domain/ports';
import { OrderService } from '../../domain/services/order.service';
import { PgEventStore } from '../pg/pg-event-store';
import { PgNotifyListener } from '../pg/pg-notify-listener';
import { TemporalScheduler } from '../temporal/temporal-scheduler';
import { SupabasePublisher } from './supabase-publisher';

/**
 * Supabase server for handling client connections and commands
 * Replaces the Colyseus room functionality
 */
export class SupabaseServer {
  private client: SupabaseClient;
  private tenantServices: Map<UUID, OrderService> = new Map();
  private eventListeners: Map<UUID, PgNotifyListener> = new Map();

  /**
   * Constructor
   * @param supabaseUrl The Supabase URL
   * @param supabaseKey The Supabase API key
   */
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseKey: string
  ) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    console.log('[SupabaseServer] Starting server');

    // Set up the Supabase Realtime client to listen for commands
    this.client
      .channel('commands')
      .on('broadcast', { event: 'command' }, async (payload) => {
        await this.handleCommand(payload);
      })
      .subscribe();

    console.log('[SupabaseServer] Server started');
  }

  /**
   * Handle a command from a client
   */
  private async handleCommand(payload: any): Promise<void> {
    try {
      // Extract the command data
      const { data, userId, tenantId } = payload;

      // Validate the command
      const commandSchema = z.object({
        type: z.string(),
        payload: z.any(),
      });

      const validatedData = commandSchema.parse(data);

      // Create a command with tenant ID and client ID
      const command: Command = {
        id: uuidv4(),
        tenant: tenantId as UUID,
        type: validatedData.type,
        payload: validatedData.payload,
        metadata: {
          userId: userId as UUID,
          timestamp: new Date(),
        },
      };

      console.log(`[SupabaseServer] Handling command: ${command.type} from user: ${userId}`);

      // Get or create the service for this tenant
      const service = await this.getOrCreateService(tenantId);

      // Dispatch the command to the domain service
      await service.dispatch(command);

      // Send acknowledgement to the client
      await this.client
        .channel(`tenant-${tenantId}`)
        .send({
          type: 'broadcast',
          event: 'ack',
          payload: { commandId: command.id }
        });
    } catch (error) {
      console.error('[SupabaseServer] Error handling command:', error);

      // Send error to the client
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your command';
      const errorCode = (error as any)?.code || 'UNKNOWN_ERROR';

      await this.client
        .channel(`tenant-${payload.tenantId}`)
        .send({
          type: 'broadcast',
          event: 'error',
          payload: { 
            message: errorMessage,
            code: errorCode,
          }
        });
    }
  }

  /**
   * Get or create a service for a tenant
   */
  private async getOrCreateService(tenantId: UUID): Promise<OrderService> {
    // Check if we already have a service for this tenant
    if (this.tenantServices.has(tenantId)) {
      return this.tenantServices.get(tenantId)!;
    }

    console.log(`[SupabaseServer] Creating service for tenant: ${tenantId}`);

    // Create adapters
    const eventStore = new PgEventStore();
    const scheduler = new TemporalScheduler();
    const publisher = new SupabasePublisher(this.supabaseUrl, this.supabaseKey);

    // Create domain service
    const service = new OrderService(eventStore, scheduler, publisher);

    // Create event listener
    const eventListener = new PgNotifyListener(tenantId, service);

    // Start listening for events
    await eventListener.start();

    // Store the service and event listener
    this.tenantServices.set(tenantId, service);
    this.eventListeners.set(tenantId, eventListener);

    console.log(`[SupabaseServer] Service created for tenant: ${tenantId}`);

    return service;
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    console.log('[SupabaseServer] Stopping server');

    // Stop all event listeners
    for (const [tenantId, eventListener] of this.eventListeners.entries()) {
      console.log(`[SupabaseServer] Stopping event listener for tenant: ${tenantId}`);
      await eventListener.stop();
    }

    // Clear the maps
    this.tenantServices.clear();
    this.eventListeners.clear();

    console.log('[SupabaseServer] Server stopped');
  }
}